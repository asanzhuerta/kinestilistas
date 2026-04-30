import bcrypt from "bcryptjs";
import { getPasswordValidationMessage } from "@/lib/utils/password-utils";
import { getDataSource } from "@/lib/typeorm/data-source";
import { User } from "@/lib/typeorm/entities/User";
import { Role } from "@/lib/typeorm/entities/Role";
import { UserStatus } from "@/lib/typeorm/entities/UserStatus";
import { UserAdminActionType } from "@/lib/typeorm/entities/UserAdminActionType";
import { UserManagementLog } from "@/lib/typeorm/entities/UserManagementLog";
import { UserRequest } from "@/lib/typeorm/entities/UserRequest";
import { UserAccessLog } from "@/lib/typeorm/entities/UserAccessLog";
import { Client } from "@/lib/typeorm/entities/Client";
import {
	applyClientUpdateOrThrow,
	UpdateClientError,
} from "@/lib/typeorm/services/commercial/client";
import { createClientFromUser } from "@/lib/typeorm/services/commercial/client-internal";
import type { EntityManager } from "typeorm";
import {
	assignClientToCommercialInternal,
	AssignClientToCommercialInternalError,
} from "@/lib/typeorm/services/commercial/client-commercial-assignment-internal";
import { deleteReplacedCloudinaryImage } from "@/lib/cloudinary";
import { createCommercialFromUser } from "@/lib/typeorm/services/commercial/commercial-internal";
import {
	REQUEST_SOURCE_TYPE_IDS,
	REQUEST_STATUS_IDS,
	USER_ADMIN_ACTION_TYPE_IDS,
	USER_STATUS_IDS,
	ROLE_IDS,
} from "@/lib/typeorm/constants/catalog-ids";
import { normalizeEmail, normalizeText } from "@/lib/utils/text";

// --------------------------------------------------------------------------
// Funciones auxiliares para normalización de datos
// --------------------------------------------------------------------------
type SyncRoleProfileInput = {
	userId: string;
	roleId: number;
	name: string;
	company?: string | null;
};

async function syncRoleProfileForUser(
	manager: EntityManager,
	input: SyncRoleProfileInput,
) {
	if (input.roleId === ROLE_IDS.CLIENT) {
		await createClientFromUser(manager, {
			userId: input.userId,
			name: input.name,
			company: input.company,
		});
	}

	if (input.roleId === ROLE_IDS.COMMERCIAL) {
		await createCommercialFromUser(manager, {
			userId: input.userId,
		});
	}
}

// --------------------------------------------------------------------------
// Tipos de datos para los inputs de los servicios
// --------------------------------------------------------------------------
// Input para desactivar un usuario
type DeactivateUserInput = {
	userId: string;
	performedByUserId: string;
	performedByEmail?: string | null;
};

// Input para registrar un nuevo usuario directamente por un administrador
type RegisterUserByAdminInput = {
	name: string;
	email: string;
	password: string;
	company?: string | null;
	phone?: string | null;
	roleId: number;
	performedByUserId: string;
	commercialId?: string | null;
};

type UpdateUserClientProfileInput = {
	name?: string;
	contact_name?: string | null;
	tax_id?: string | null;
	address?: string;
	city?: string;
	postal_code?: string | null;
	province?: string | null;
	lat?: number | string | null;
	lng?: number | string | null;
	visit_window_start_time?: string | null;
	visit_window_end_time?: string | null;
	notes?: string | null;
};

// Input para actualizar los datos de un usuario
type UpdateUserInput = {
	userId: string;
	performedByUserId: string;
	name: string;
	email: string;
	company?: string | null;
	phone?: string | null;
	profile_image_url?: string | null;
	roleId: number;
	statusId: number;
	password?: string;
	confirmPassword?: string;
	clientProfile?: UpdateUserClientProfileInput | null;
};
// Input para listar usuarios de forma paginada.
// Se añade como alternativa al listado legacy para permitir búsquedas y limitar
// el tamaño de respuesta en endpoints más sensibles o costosos.
type ListUsersPaginatedInput = {
	page?: number;
	pageSize?: number;
	search?: string | null;
};

// Tipo de retorno para el listado paginado de usuarios.
type ListUsersPaginatedResult = {
	items: User[];
	page: number;
	pageSize: number;
	total: number;
	totalPages: number;
};

// Tipo auxiliar para mapear los IDs de las acciones del catálogo, utilizado en el servicio de actualización de usuario para registrar cambios de rol, estado y contraseña.
type CatalogActionRow = {
	id: number;
	code: string;
};

// --------------------------------------------------------------------------
// Helpers internos de paginación
// --------------------------------------------------------------------------
function normalizePage(value: number | null | undefined) {
	const page = Number(value);

	if (!Number.isInteger(page) || page <= 0) {
		return 1;
	}

	return page;
}

function normalizePageSize(value: number | null | undefined) {
	const pageSize = Number(value);

	if (!Number.isInteger(pageSize) || pageSize <= 0) {
		return 20;
	}

	return Math.min(pageSize, 50);
}

// --------------------------------------------------------------------------
// SERVICIOS
// --------------------------------------------------------------------------
// Servicio para desactivar un usuario, cambiando su estado a "inactive". Registra la acción en el log de administración de usuarios, incluyendo quién realizó la acción y por qué.
export class DeactivateUserError extends Error {
	code:
		| "USER_NOT_FOUND"
		| "SELF_DEACTIVATION_NOT_ALLOWED"
		| "INACTIVE_STATUS_NOT_FOUND"
		| "DEACTIVATE_ACTION_NOT_FOUND";

	constructor(code: DeactivateUserError["code"], message: string) {
		super(message);
		this.name = "DeactivateUserError";
		this.code = code;
	}
}

export async function deactivateUser(input: DeactivateUserInput) {
	const ds = await getDataSource();

	return ds.transaction(async (manager) => {
		const userRepo = manager.getRepository(User);
		const statusRepo = manager.getRepository(UserStatus);
		const logRepo = manager.getRepository(UserManagementLog);
		const actionTypeRepo = manager.getRepository(UserAdminActionType);
		const accessLogRepo = manager.getRepository(UserAccessLog);

		const user = await userRepo.findOne({
			where: { id: input.userId },
			relations: {
				role: true,
				status: true,
			},
		});

		if (!user) {
			throw new DeactivateUserError("USER_NOT_FOUND", "Usuario no encontrado");
		}

		if (user.id === input.performedByUserId) {
			throw new DeactivateUserError(
				"SELF_DEACTIVATION_NOT_ALLOWED",
				"No puedes desactivar tu propio usuario",
			);
		}

		if (user.status.code === "inactive") {
			return user;
		}

		const inactiveStatus = await statusRepo.findOne({
			where: { code: "inactive" },
		});

		if (!inactiveStatus) {
			throw new DeactivateUserError(
				"INACTIVE_STATUS_NOT_FOUND",
				"No existe el estado 'inactive' en user_statuses",
			);
		}

		const deactivateAction = await actionTypeRepo.findOne({
			where: { code: "deactivate_user" },
		});

		if (!deactivateAction) {
			throw new DeactivateUserError(
				"DEACTIVATE_ACTION_NOT_FOUND",
				"No existe la acción 'deactivate_user' en user_admin_action_types",
			);
		}

		const previousStatusId = user.status_id;
		const previousRoleId = user.role_id;
		const updatedAt = new Date();

		await userRepo
			.createQueryBuilder()
			.update(User)
			.set({
				status_id: inactiveStatus.id,
				updated_at: updatedAt,
			})
			.where("id = :id", { id: user.id })
			.execute();

		// Revoca cualquier sesion activa para que la desactivacion
		// tenga efecto inmediato y no dependa de la expiracion del JWT.
		await accessLogRepo
			.createQueryBuilder()
			.update()
			.set({
				revoked_at: () => "NOW()",
			})
			.where("user_id = :userId", { userId: user.id })
			.andWhere("session_token IS NOT NULL")
			.andWhere("revoked_at IS NULL")
			.execute();

		const log = logRepo.create({
			target_user_id: user.id,
			performed_by: input.performedByUserId,
			action_type_id: deactivateAction.id,
			previous_status_id: previousStatusId,
			new_status_id: inactiveStatus.id,
			previous_role_id: previousRoleId,
			new_role_id: previousRoleId,
			reason: "Desactivación manual desde administración de usuarios",
			notes: `Usuario desactivado manualmente por ${
				input.performedByEmail ?? "admin"
			}`,
		});

		await logRepo.save(log);

		return userRepo.findOne({
			where: { id: user.id },
			relations: {
				role: true,
				status: true,
			},
		});
	});
}

// Servicio para obtener un usuario por su ID, incluyendo su rol y estado.
// Devuelve null si no se encuentra el usuario.
export async function getUserById(id: string) {
	const ds = await getDataSource();
	const repo = ds.getRepository(User);

	return repo.findOne({
		where: { id },
		relations: {
			role: true,
			status: true,
			linkedClient: true,
		},
	});
}

// Servicio para listar los usuarios registrados en el sistema, incluyendo sus roles y estados, ordenados por fecha de creación descendente.
export async function listUsers() {
	const ds = await getDataSource();
	const repo = ds.getRepository(User);

	return repo.find({
		relations: {
			role: true,
			status: true,
		},
		order: {
			created_at: "DESC",
		},
	});
}

// Servicio para listar usuarios de forma paginada.
// Esta variante permite reducir el coste del endpoint en escenarios con muchos
// usuarios y facilita incorporar búsqueda incremental desde la interfaz.
export async function listUsersPaginated(
	input: ListUsersPaginatedInput = {},
): Promise<ListUsersPaginatedResult> {
	const ds = await getDataSource();
	const repo = ds.getRepository(User);

	const page = normalizePage(input.page);
	const pageSize = normalizePageSize(input.pageSize);
	const search = normalizeText(input.search);

	const qb = repo
		.createQueryBuilder("u")
		.leftJoinAndSelect("u.role", "role")
		.leftJoinAndSelect("u.status", "status")
		.orderBy("u.created_at", "DESC")
		.skip((page - 1) * pageSize)
		.take(pageSize);

	if (search) {
		qb.andWhere(
			`
				LOWER(u.name) LIKE LOWER(:search)
				OR LOWER(u.email) LIKE LOWER(:search)
				OR LOWER(COALESCE(u.company, '')) LIKE LOWER(:search)
				OR LOWER(COALESCE(u.phone, '')) LIKE LOWER(:search)
			`,
			{
				search: `%${search}%`,
			},
		);
	}

	const [items, total] = await qb.getManyAndCount();

	return {
		items,
		page,
		pageSize,
		total,
		totalPages: total > 0 ? Math.ceil(total / pageSize) : 1,
	};
}

// Servicio único para dar de alta usuarios desde administración.
// Además de crear el usuario activo, genera la request asociada ya aprobada
// para mantener trazabilidad completa del proceso de alta.
export class RegisterUserByAdminError extends Error {
	status: number;
	code: string;

	constructor(
		message: string,
		status = 400,
		code = "REGISTER_USER_BY_ADMIN_ERROR",
	) {
		super(message);
		this.name = "RegisterUserByAdminError";
		this.status = status;
		this.code = code;
	}
}

export async function registerUserByAdmin(input: RegisterUserByAdminInput) {
	const name = normalizeText(input.name);
	const email = normalizeEmail(input.email);
	const password = String(input.password ?? "");
	const company = normalizeText(input.company) || null;
	const phone = normalizeText(input.phone) || null;
	const roleId = Number(input.roleId);
	const commercialId = normalizeText(input.commercialId) || null;

	if (!name || !email || !password || !roleId) {
		throw new RegisterUserByAdminError(
			"Faltan campos obligatorios",
			400,
			"INVALID_DATA",
		);
	}

	if (roleId === ROLE_IDS.CLIENT && !commercialId) {
		throw new RegisterUserByAdminError(
			"Debes indicar el comercial asignado para crear un cliente",
			400,
			"COMMERCIAL_REQUIRED_FOR_CLIENT",
		);
	}

	const passwordValidationMessage = getPasswordValidationMessage(password);

	if (passwordValidationMessage) {
		throw new RegisterUserByAdminError(
			passwordValidationMessage,
			400,
			"PASSWORD_RULES",
		);
	}

	const ds = await getDataSource();

	return ds.transaction(async (manager) => {
		const userRepo = manager.getRepository(User);
		const userRequestRepo = manager.getRepository(UserRequest);
		const logRepo = manager.getRepository(UserManagementLog);

		const existingUser = await userRepo
			.createQueryBuilder("u")
			.where("LOWER(u.email) = LOWER(:email)", { email })
			.getOne();

		if (existingUser) {
			throw new RegisterUserByAdminError(
				"Ya existe un usuario con ese correo",
				409,
				"EMAIL_EXISTS",
			);
		}

		const existingPendingRequest = await userRequestRepo
			.createQueryBuilder("ur")
			.where("LOWER(ur.email) = LOWER(:email)", { email })
			.andWhere("ur.status_id = :pendingStatusId", {
				pendingStatusId: REQUEST_STATUS_IDS.PENDING,
			})
			.getOne();

		if (existingPendingRequest) {
			throw new RegisterUserByAdminError(
				"Ya existe una solicitud pendiente con ese correo",
				409,
				"REQUEST_EXISTS",
			);
		}

		const passwordHash = await bcrypt.hash(password, 10);

		const createdUser = await userRepo.save(
			userRepo.create({
				name,
				email,
				password_hash: passwordHash,
				company,
				phone,
				role_id: roleId,
				status_id: USER_STATUS_IDS.ACTIVE,
				profile_image_url: null,
				last_login_at: null,
			}),
		);

		// --------------------------------------------------------------------------
		// Sincronización automática del perfil derivado según rol
		// --------------------------------------------------------------------------
		await syncRoleProfileForUser(manager, {
			userId: createdUser.id,
			roleId,
			name,
			company,
		});

		// --------------------------------------------------------------------------
		// Asignación comercial obligatoria para clientes creados por admin
		// --------------------------------------------------------------------------
		if (roleId === ROLE_IDS.CLIENT && commercialId) {
			try {
				await assignClientToCommercialInternal(manager, {
					clientId: createdUser.id,
					commercialId,
					assignedByUserId: input.performedByUserId,
					notes:
						"Asignación creada automáticamente durante el alta del cliente",
				});
			} catch (error) {
				if (error instanceof AssignClientToCommercialInternalError) {
					throw new RegisterUserByAdminError(
						error.message,
						error.status,
						error.code,
					);
				}

				throw error;
			}
		}
		const reviewedAt = new Date();

		const createdRequest = await userRequestRepo.save(
			userRequestRepo.create({
				email,
				password_hash: passwordHash,
				name,
				phone,
				company,
				requested_role_id: roleId,
				status_id: REQUEST_STATUS_IDS.APPROVED,
				request_source_type_id: REQUEST_SOURCE_TYPE_IDS.ADMIN_CREATED,
				requested_at: reviewedAt,
				reviewed_at: reviewedAt,
				reviewed_by: input.performedByUserId,
				rejection_reason: null,
				created_user_id: createdUser.id,
			}),
		);

		await logRepo.save(
			logRepo.create({
				target_user_id: createdUser.id,
				performed_by: input.performedByUserId,
				action_type_id: USER_ADMIN_ACTION_TYPE_IDS.USER_APPROVED,
				previous_status_id: null,
				new_status_id: USER_STATUS_IDS.ACTIVE,
				previous_role_id: null,
				new_role_id: roleId,
				reason: null,
				notes: `Usuario creado desde administración mediante alta directa. Request asociada y aprobada: ${createdRequest.id}`,
			}),
		);

		return userRepo.findOne({
			where: { id: createdUser.id },
			relations: {
				role: true,
				status: true,
			},
		});
	});
}

// Servicio para actualizar los datos de un usuario, incluyendo su rol, estado y contraseña. Registra las acciones de cambio de rol, estado y contraseña en el log de administración de usuarios para auditoría.
export class UpdateUserError extends Error {
	status: number;
	code: string;

	constructor(message: string, status = 400, code = "UPDATE_USER_ERROR") {
		super(message);
		this.name = "UpdateUserError";
		this.status = status;
		this.code = code;
	}
}

export async function updateUser(input: UpdateUserInput) {
	const name = normalizeText(input.name);
	const email = normalizeEmail(input.email);
	const company = normalizeText(input.company) || null;
	const phone = normalizeText(input.phone) || null;
	const profileImageUrl = normalizeText(input.profile_image_url) || null;
	const roleId = Number(input.roleId);
	const statusId = Number(input.statusId);
	const password = String(input.password ?? "");
	const confirmPassword = String(input.confirmPassword ?? "");
	const clientProfile = input.clientProfile ?? null;

	if (!name || !email || !roleId || !statusId) {
		throw new UpdateUserError("Datos inválidos", 400, "INVALID_DATA");
	}

	if (password || confirmPassword) {
		if (password !== confirmPassword) {
			throw new UpdateUserError(
				"Las contraseñas no coinciden",
				400,
				"PASSWORD_MATCH",
			);
		}

		const passwordValidationMessage = getPasswordValidationMessage(password);

		if (passwordValidationMessage) {
			throw new UpdateUserError(
				passwordValidationMessage,
				400,
				"PASSWORD_RULES",
			);
		}
	}

	const ds = await getDataSource();

	const result = await ds.transaction(async (manager) => {
		const userRepo = manager.getRepository(User);
		const roleRepo = manager.getRepository(Role);
		const statusRepo = manager.getRepository(UserStatus);
		const actionTypeRepo = manager.getRepository(UserAdminActionType);
		const logRepo = manager.getRepository(UserManagementLog);
		const clientRepo = manager.getRepository(Client);

		const currentUser = await userRepo.findOne({
			where: { id: input.userId },
		});

		if (!currentUser) {
			throw new UpdateUserError("Usuario no encontrado", 404, "USER_NOT_FOUND");
		}

		const duplicateEmailUser = await userRepo
			.createQueryBuilder("u")
			.where("lower(u.email) = lower(:email)", { email })
			.andWhere("u.id <> :id", { id: input.userId })
			.getOne();

		if (duplicateEmailUser) {
			throw new UpdateUserError(
				"Ya existe un usuario con ese correo",
				409,
				"EMAIL_EXISTS",
			);
		}

		const [newRole, newStatus] = await Promise.all([
			roleRepo.findOne({ where: { id: roleId } }),
			statusRepo.findOne({ where: { id: statusId } }),
		]);

		if (!newRole || !newStatus) {
			throw new UpdateUserError("Datos inválidos", 400, "INVALID_DATA");
		}

		const actionTypes = (await actionTypeRepo
			.createQueryBuilder("uat")
			.where("uat.code IN (:...codes)", {
				codes: ["role_change", "status_change", "password_reset"],
			})
			.getMany()) as CatalogActionRow[];

		const passwordResetActionId = actionTypes.find(
			(row) => row.code === "password_reset",
		)?.id;

		const roleChangeActionId = actionTypes.find(
			(row) => row.code === "role_change",
		)?.id;

		const statusChangeActionId = actionTypes.find(
			(row) => row.code === "status_change",
		)?.id;

		const notesParts: string[] = [];

		if (currentUser.name !== name) {
			notesParts.push(`Nombre: "${currentUser.name}" -> "${name}"`);
		}

		if (currentUser.email !== email) {
			notesParts.push(`Correo: "${currentUser.email}" -> "${email}"`);
		}

		if ((currentUser.company ?? "") !== (company ?? "")) {
			notesParts.push(
				`Empresa: "${currentUser.company ?? "-"}" -> "${company ?? "-"}"`,
			);
		}

		if ((currentUser.phone ?? "") !== (phone ?? "")) {
			notesParts.push(
				`Teléfono: "${currentUser.phone ?? "-"}" -> "${phone ?? "-"}"`,
			);
		}

		if ((currentUser.profile_image_url ?? "") !== (profileImageUrl ?? "")) {
			notesParts.push(
				`Imagen de perfil: "${currentUser.profile_image_url ?? "-"}" -> "${profileImageUrl ?? "-"}"`,
			);
		}

		const notes = notesParts.length > 0 ? notesParts.join(" | ") : null;

		if (password) {
			currentUser.password_hash = await bcrypt.hash(password, 10);

			if (passwordResetActionId) {
				await logRepo.save(
					logRepo.create({
						target_user_id: input.userId,
						performed_by: input.performedByUserId,
						action_type_id: passwordResetActionId,
						previous_status_id: null,
						new_status_id: null,
						previous_role_id: null,
						new_role_id: null,
						reason: null,
						notes: "Contraseña actualizada por administrador",
					}),
				);
			}
		}

		const previousRoleId = currentUser.role_id;
		const previousStatusId = currentUser.status_id;
		const previousProfileImageUrl = currentUser.profile_image_url;

		currentUser.name = name;
		currentUser.email = email;
		currentUser.company = company;
		currentUser.phone = phone;
		currentUser.profile_image_url = profileImageUrl;
		currentUser.role_id = roleId;
		currentUser.status_id = statusId;
		currentUser.updated_at = new Date();

		await userRepo.save(currentUser);

		await syncRoleProfileForUser(manager, {
			userId: currentUser.id,
			roleId,
			name,
			company,
		});

		// ----------------------------------------------------------------------
		// Sincronización del perfil cliente cuando se edita desde admin
		// ----------------------------------------------------------------------
		// El formulario admin de usuario ya envía clientProfile, pero hasta ahora
		// este servicio no estaba aplicando esos cambios a la tabla clients.
		// ----------------------------------------------------------------------
		// Sincronización del perfil cliente cuando se edita desde admin
		// ----------------------------------------------------------------------
		if (roleId === ROLE_IDS.CLIENT && clientProfile) {
			const linkedClient = await clientRepo.findOne({
				where: { id: currentUser.id },
			});

			if (!linkedClient) {
				throw new UpdateUserError(
					"Perfil de cliente no encontrado",
					404,
					"CLIENT_PROFILE_NOT_FOUND",
				);
			}

			try {
				await applyClientUpdateOrThrow(linkedClient, {
					name: clientProfile.name ?? name,
					contactName: clientProfile.contact_name,
					taxId: clientProfile.tax_id,
					address: clientProfile.address,
					city: clientProfile.city,
					postalCode: clientProfile.postal_code,
					province: clientProfile.province,
					lat: clientProfile.lat,
					lng: clientProfile.lng,
					visitWindowStartTime: clientProfile.visit_window_start_time,
					visitWindowEndTime: clientProfile.visit_window_end_time,
					notes: clientProfile.notes,
				});
			} catch (error) {
				if (error instanceof UpdateClientError) {
					throw new UpdateUserError(
						error.message,
						error.status,
						"INVALID_CLIENT_PROFILE_DATA",
					);
				}

				throw error;
			}

			await clientRepo.save(linkedClient);
		}

		if (previousRoleId !== roleId && roleChangeActionId) {
			await logRepo.save(
				logRepo.create({
					target_user_id: input.userId,
					performed_by: input.performedByUserId,
					action_type_id: roleChangeActionId,
					previous_status_id: null,
					new_status_id: null,
					previous_role_id: previousRoleId,
					new_role_id: roleId,
					reason: null,
					notes,
				}),
			);
		}

		if (previousStatusId !== statusId && statusChangeActionId) {
			await logRepo.save(
				logRepo.create({
					target_user_id: input.userId,
					performed_by: input.performedByUserId,
					action_type_id: statusChangeActionId,
					previous_status_id: previousStatusId,
					new_status_id: statusId,
					previous_role_id: null,
					new_role_id: null,
					reason: null,
					notes,
				}),
			);
		}

		return {
			message: "Usuario actualizado correctamente",
			userId: currentUser.id,
			previousProfileImageUrl,
			nextProfileImageUrl: currentUser.profile_image_url,
		};
	});

	try {
		await deleteReplacedCloudinaryImage(
			result.previousProfileImageUrl,
			result.nextProfileImageUrl,
		);
	} catch (cleanupError) {
		console.error(
			"[users/updateUser] Error borrando la imagen anterior de Cloudinary:",
			cleanupError,
		);
	}

	return {
		message: result.message,
		userId: result.userId,
	};
}
