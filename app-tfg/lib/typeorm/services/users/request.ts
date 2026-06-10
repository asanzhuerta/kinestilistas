import { getDataSource } from "@/lib/typeorm/data-source";
import { UserRequest } from "@/lib/typeorm/entities/UserRequest";
import { RequestStatus } from "@/lib/typeorm/entities/RequestStatus";
import {
	REQUEST_SOURCE_TYPE_IDS,
	REQUEST_STATUS_IDS,
	ROLE_IDS,
} from "@/lib/typeorm/constants/catalog-ids";
import bcrypt from "bcryptjs";
import { UserManagementLog } from "@/lib/typeorm/entities/UserManagementLog";
import { USER_ADMIN_ACTION_TYPE_IDS } from "../../constants/catalog-ids";
import { User } from "@/lib/typeorm/entities/User";
import { createClientFromUser } from "@/lib/typeorm/services/commercial/client-internal";
import { createCommercialFromUser } from "@/lib/typeorm/services/commercial/commercial-internal";
import { assignClientToCommercialInternal } from "@/lib/typeorm/services/commercial/client-commercial-assignment-internal";

// Servicio para manejar las solicitudes de registro de nuevos usuarios. Incluye funciones para crear una nueva solicitud, listar solicitudes pendientes, obtener una solicitud por ID y rechazar una solicitud con una razón específica.
export async function approveUserRequest(
	requestId: string,
	performedByUserId: string,
	commercialIdInput?: string | null,
) {
	const ds = await getDataSource();
	const commercialId = String(commercialIdInput ?? "").trim() || null;

	return ds.transaction(async (manager) => {
		const userRequestRepo = manager.getRepository(UserRequest);
		const userRepo = manager.getRepository(User);
		const logRepo = manager.getRepository(UserManagementLog);
		const requestStatusRepo = manager.getRepository(RequestStatus);

		const request = await userRequestRepo.findOne({
			where: { id: requestId },
			relations: {
				requestedRole: true,
				status: true,
				requestSourceType: true,
				reviewedByUser: true,
				createdUser: true,
			},
		});

		if (!request) {
			throw new Error("Solicitud no encontrada");
		}

		const pendingStatus = await requestStatusRepo.findOne({
			where: { code: "pending" },
		});
		const approvedStatus = await requestStatusRepo.findOne({
			where: { code: "approved" },
		});

		if (!pendingStatus || !approvedStatus) {
			throw new Error("No se pudieron resolver los estados de solicitud");
		}

		if (request.status_id !== pendingStatus.id) {
			throw new Error("La solicitud no está pendiente");
		}

		const existingUser = await userRepo
			.createQueryBuilder("u")
			.where("LOWER(u.email) = LOWER(:email)", {
				email: request.email,
			})
			.getOne();

		if (existingUser) {
			throw new Error("Ya existe un usuario con ese correo");
		}

		const activeUserStatus = 1;

		const user = userRepo.create({
			name: request.name,
			email: request.email.toLowerCase(),
			password_hash: request.password_hash,
			company: request.company,
			phone: request.phone,
			role_id: request.requested_role_id,
			status_id: activeUserStatus,
			profile_image_url: null,
			last_login_at: null,
		});

		const savedUser = await userRepo.save(user);
		if (request.requested_role_id === ROLE_IDS.CLIENT) {
			if (!commercialId) {
				throw new Error(
					"Debes indicar el comercial asignado para aprobar una solicitud de cliente",
				);
			}

			await createClientFromUser(manager, {
				userId: savedUser.id,
				name: request.name,
				company: request.company,
			});

			await assignClientToCommercialInternal(manager, {
				clientId: savedUser.id,
				commercialId,
				assignedByUserId: performedByUserId,
				notes: "Asignación creada automáticamente al aprobar la solicitud",
			});
		}

		if (request.requested_role_id === ROLE_IDS.COMMERCIAL) {
			await createCommercialFromUser(manager, {
				userId: savedUser.id,
			});
		}
		const reviewedAt = new Date();

		await userRequestRepo.update(
			{ id: request.id },
			{
				status_id: approvedStatus.id,
				reviewed_at: reviewedAt,
				reviewed_by: performedByUserId,
				created_user_id: savedUser.id,
				rejection_reason: null,
			},
		);

		const refreshedRequest = await userRequestRepo.findOne({
			where: { id: request.id },
			relations: {
				requestedRole: true,
				status: true,
				requestSourceType: true,
				reviewedByUser: true,
				createdUser: true,
			},
		});

		if (!refreshedRequest) {
			throw new Error("No se pudo recargar la solicitud aprobada");
		}

		await logRepo.save(
			logRepo.create({
				target_user_id: savedUser.id,
				performed_by: performedByUserId,
				action_type_id: USER_ADMIN_ACTION_TYPE_IDS.USER_APPROVED,
				previous_status_id: null,
				new_status_id: activeUserStatus,
				previous_role_id: null,
				new_role_id: savedUser.role_id,
				reason: null,
				notes: `Solicitud aprobada (${request.id}) y usuario creado`,
			}),
		);

		return {
			request: refreshedRequest,
			user: await userRepo.findOne({
				where: { id: savedUser.id },
				relations: {
					role: true,
					status: true,
				},
			}),
		};
	});
}

// Servicio para manejar las solicitudes de registro de nuevos usuarios. Incluye funciones para crear una nueva solicitud, listar solicitudes pendientes, obtener una solicitud por ID y rechazar una solicitud con una razón específica.
type CreateRegisterRequestInput = {
	name: string;
	email: string;
	password: string;
	company?: string | null;
	phone?: string | null;
	roleId?: number;
};

// Crea una solicitud de alta pública.
// No crea el usuario final; solo deja la solicitud pendiente de revisión.
export async function createRegisterRequest(input: CreateRegisterRequestInput) {
	const ds = await getDataSource();

	return ds.transaction(async (manager) => {
		const userRepo = manager.getRepository(User);
		const userRequestRepo = manager.getRepository(UserRequest);

		const normalizedEmail = input.email.trim().toLowerCase();

		const existingUser = await userRepo.findOne({
			where: { email: normalizedEmail },
		});

		if (existingUser) {
			throw new Error("Ya existe un usuario con ese correo");
		}

		const existingRequest = await userRequestRepo.findOne({
			where: { email: normalizedEmail },
		});

		if (
			existingRequest &&
			existingRequest.status_id === REQUEST_STATUS_IDS.PENDING
		) {
			throw new Error("Ya existe una solicitud pendiente con ese correo");
		}

		const passwordHash = await bcrypt.hash(input.password, 10);

		const request = userRequestRepo.create({
			name: input.name.trim(),
			email: normalizedEmail,
			password_hash: passwordHash,
			company: input.company?.trim() || null,
			phone: input.phone?.trim() || null,
			requested_role_id: input.roleId ?? ROLE_IDS.CLIENT,
			status_id: REQUEST_STATUS_IDS.PENDING,
			request_source_type_id: REQUEST_SOURCE_TYPE_IDS.SELF_REGISTRATION,
			reviewed_at: null,
			reviewed_by: null,
			rejection_reason: null,
			created_user_id: null,
		});

		const savedRequest = await userRequestRepo.save(request);

		return userRequestRepo.findOne({
			where: { id: savedRequest.id },
			relations: {
				requestedRole: true,
				status: true,
				requestSourceType: true,
				reviewedByUser: true,
				createdUser: true,
			},
		});
	});
}

// Devuelve una solicitud concreta por su ID con todas sus relaciones.
// Se reutiliza tanto desde páginas server como desde la API.
export async function getUserRequestById(id: string) {
	const ds = await getDataSource();
	const repo = ds.getRepository(UserRequest);

	return repo.findOne({
		where: { id },
		relations: {
			requestedRole: true,
			status: true,
			requestSourceType: true,
			reviewedByUser: true,
			createdUser: true,
		},
	});
}

// Servicio para listar las solicitudes de usuario pendientes, con toda la información relacionada (rol solicitado, estado, fuente de la solicitud, usuario que la creó, etc.).
export async function listUserRequests() {
	const ds = await getDataSource();

	const repo = ds.getRepository(UserRequest);

	return repo.find({
		where: {
			status_id: REQUEST_STATUS_IDS.PENDING,
		},
		relations: {
			requestedRole: true,
			status: true,
			requestSourceType: true,
			reviewedByUser: true,
			createdUser: true,
		},
		order: {
			requested_at: "DESC",
		},
	});
}

// Servicio para rechazar una solicitud de usuario, actualizando su estado a "rechazada" y registrando la razón de la rechazo.
export async function rejectUserRequest(
	requestId: string,
	performedByUserId: string,
	rejectionReason: string,
) {
	const ds = await getDataSource();

	return ds.transaction(async (manager) => {
		const userRequestRepo = manager.getRepository(UserRequest);
		const requestStatusRepo = manager.getRepository(RequestStatus);

		const request = await userRequestRepo.findOne({
			where: { id: requestId },
			relations: {
				requestedRole: true,
				status: true,
				requestSourceType: true,
				reviewedByUser: true,
				createdUser: true,
			},
		});

		if (!request) {
			throw new Error("Solicitud no encontrada");
		}

		const [pendingStatus, rejectedStatus] = await Promise.all([
			requestStatusRepo.findOne({ where: { code: "pending" } }),
			requestStatusRepo.findOne({ where: { code: "rejected" } }),
		]);

		if (!pendingStatus || !rejectedStatus) {
			throw new Error("No se pudieron resolver los estados de solicitud");
		}

		if (request.status_id !== pendingStatus.id) {
			throw new Error("La solicitud no está pendiente");
		}

		const reviewedAt = new Date();

		await userRequestRepo.update(
			{ id: request.id },
			{
				status_id: rejectedStatus.id,
				reviewed_at: reviewedAt,
				reviewed_by: performedByUserId,
				rejection_reason: rejectionReason,
			},
		);

		return userRequestRepo.findOne({
			where: { id: request.id },
			relations: {
				requestedRole: true,
				status: true,
				requestSourceType: true,
				reviewedByUser: true,
				createdUser: true,
			},
		});
	});
}
