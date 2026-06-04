import { In, QueryFailedError } from "typeorm";
import type { EntityManager } from "typeorm";
import { getDataSource } from "@/lib/typeorm/data-source";
import { ROLE_IDS, USER_STATUS_IDS } from "@/lib/typeorm/constants/catalog-ids";
import type {
	AdminAssignClientSegmentBody,
	AdminUpsertCustomerSegmentBody,
	AdminUpsertPromotionBody,
	AdminUpsertTrainingEventBody,
	AppReminderStatus,
	PromotionStatus,
	TrainingEnrollmentBody,
	TrainingEventModality,
	TrainingEventStatus,
	UpsertAppReminderBody,
} from "@/lib/contracts/communications";
import { CustomerSegment } from "@/lib/typeorm/entities/CustomerSegment";
import { ClientCustomerSegment } from "@/lib/typeorm/entities/ClientCustomerSegment";
import { Promotion } from "@/lib/typeorm/entities/Promotion";
import { TrainingEvent } from "@/lib/typeorm/entities/TrainingEvent";
import { TrainingEnrollment } from "@/lib/typeorm/entities/TrainingEnrollment";
import { AppNotification } from "@/lib/typeorm/entities/AppNotification";
import { AppReminder } from "@/lib/typeorm/entities/AppReminder";
import { Product } from "@/lib/typeorm/entities/Product";
import { ProductLine } from "@/lib/typeorm/entities/ProductLine";
import { Client } from "@/lib/typeorm/entities/Client";
import { User } from "@/lib/typeorm/entities/User";

const PROMOTION_STATUSES = ["draft", "active", "archived"] as const;
const TRAINING_EVENT_STATUSES = [
	"draft",
	"published",
	"cancelled",
	"completed",
] as const;
const TRAINING_MODALITIES = ["in_person", "online", "hybrid"] as const;
const REMINDER_STATUSES = ["pending", "done", "cancelled"] as const;
const ACTIVE_ENROLLMENT_STATUSES = ["registered", "attended"] as const;
const ACTIVE_ENROLLMENT_STATUS_SET = new Set<string>([
	...ACTIVE_ENROLLMENT_STATUSES,
]);

type QueryDriverError = {
	code?: string;
	constraint?: string;
};

const CONSTRAINT_ERRORS: Record<
	string,
	{ message: string; code: string; status?: number }
> = {
	customer_segments_code_unique: {
		message: "Ya existe un segmento con ese codigo",
		code: "DUPLICATE_CUSTOMER_SEGMENT_CODE",
		status: 409,
	},
	UQ_customer_segments_code: {
		message: "Ya existe un segmento con ese codigo",
		code: "DUPLICATE_CUSTOMER_SEGMENT_CODE",
		status: 409,
	},
	client_customer_segments_client_segment_unique: {
		message: "El cliente ya pertenece a ese segmento",
		code: "DUPLICATE_CLIENT_SEGMENT_ASSIGNMENT",
		status: 409,
	},
	UQ_client_customer_segments_client_segment: {
		message: "El cliente ya pertenece a ese segmento",
		code: "DUPLICATE_CLIENT_SEGMENT_ASSIGNMENT",
		status: 409,
	},
	training_enrollments_event_user_unique: {
		message: "El usuario ya esta inscrito en esta formacion",
		code: "DUPLICATE_TRAINING_ENROLLMENT",
		status: 409,
	},
	UQ_training_enrollments_event_user: {
		message: "El usuario ya esta inscrito en esta formacion",
		code: "DUPLICATE_TRAINING_ENROLLMENT",
		status: 409,
	},
};

export class CommunicationsServiceError extends Error {
	status: number;
	code: string;

	constructor(
		message: string,
		status = 400,
		code = "COMMUNICATIONS_SERVICE_ERROR",
	) {
		super(message);
		this.name = "CommunicationsServiceError";
		this.status = status;
		this.code = code;
	}
}

function getDriverError(error: unknown): QueryDriverError | null {
	if (!(error instanceof QueryFailedError)) {
		return null;
	}

	const maybeDriverError = (
		error as QueryFailedError & { driverError?: QueryDriverError }
	).driverError;

	return maybeDriverError && typeof maybeDriverError === "object"
		? maybeDriverError
		: null;
}

function rethrowCommunicationsPersistenceError(
	error: unknown,
	fallbackMessage: string,
	fallbackCode = "COMMUNICATIONS_PERSISTENCE_ERROR",
) {
	if (error instanceof CommunicationsServiceError) {
		throw error;
	}

	const driverError = getDriverError(error);

	if (driverError?.constraint && CONSTRAINT_ERRORS[driverError.constraint]) {
		const constraintError = CONSTRAINT_ERRORS[driverError.constraint];
		throw new CommunicationsServiceError(
			constraintError.message,
			constraintError.status ?? 409,
			constraintError.code,
		);
	}

	if (driverError?.code === "23503") {
		throw new CommunicationsServiceError(
			"Alguna de las relaciones indicadas no es valida",
			400,
			"INVALID_COMMUNICATIONS_RELATION",
		);
	}

	if (driverError?.code === "23514") {
		throw new CommunicationsServiceError(
			"Los datos no cumplen las reglas de negocio de comunicaciones",
			400,
			"INVALID_COMMUNICATIONS_CONSTRAINT",
		);
	}

	throw new CommunicationsServiceError(fallbackMessage, 500, fallbackCode);
}

function normalizeText(
	value: string | null | undefined,
	fieldName: string,
	options: { required?: boolean } = {},
) {
	if (value === undefined) {
		if (options.required) {
			throw new CommunicationsServiceError(`${fieldName} es obligatorio`);
		}

		return undefined;
	}

	const normalized = String(value ?? "").trim().replace(/\s+/g, " ");

	if (!normalized && options.required) {
		throw new CommunicationsServiceError(`${fieldName} es obligatorio`);
	}

	return normalized || null;
}

function normalizeCode(value: string | null | undefined, required = false) {
	const normalized = normalizeText(value, "El codigo", { required });

	if (normalized === undefined || normalized === null) {
		return normalized;
	}

	const code = normalized
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, "-")
		.replace(/^-+|-+$/g, "");

	if (!code) {
		throw new CommunicationsServiceError("El codigo no es valido");
	}

	return code;
}

function normalizeOptionalId(value: string | null | undefined) {
	if (value === undefined) {
		return undefined;
	}

	const normalized = String(value ?? "").trim();
	return normalized || null;
}

function normalizeDateOnly(
	value: string | null | undefined,
	fieldName: string,
	options: { required?: boolean } = {},
) {
	if (value === undefined) {
		if (options.required) {
			throw new CommunicationsServiceError(`${fieldName} es obligatoria`);
		}

		return undefined;
	}

	const normalized = String(value ?? "").trim();

	if (!normalized) {
		if (options.required) {
			throw new CommunicationsServiceError(`${fieldName} es obligatoria`);
		}

		return null;
	}

	if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
		throw new CommunicationsServiceError(
			`${fieldName} debe tener formato YYYY-MM-DD`,
			400,
			"INVALID_DATE_FORMAT",
		);
	}

	const parsed = new Date(`${normalized}T00:00:00.000Z`);

	if (Number.isNaN(parsed.getTime())) {
		throw new CommunicationsServiceError(
			`${fieldName} no es una fecha valida`,
			400,
			"INVALID_DATE",
		);
	}

	return normalized;
}

function normalizeDateTime(
	value: string | null | undefined,
	fieldName: string,
	options: { required?: boolean } = {},
) {
	if (value === undefined) {
		if (options.required) {
			throw new CommunicationsServiceError(`${fieldName} es obligatoria`);
		}

		return undefined;
	}

	const normalized = String(value ?? "").trim();

	if (!normalized) {
		if (options.required) {
			throw new CommunicationsServiceError(`${fieldName} es obligatoria`);
		}

		return null;
	}

	const parsed = new Date(normalized);

	if (Number.isNaN(parsed.getTime())) {
		throw new CommunicationsServiceError(
			`${fieldName} no es una fecha valida`,
			400,
			"INVALID_DATETIME",
		);
	}

	return parsed;
}

function normalizePositiveInteger(
	value: number | string | null | undefined,
	fieldName: string,
) {
	if (value === undefined) {
		return undefined;
	}

	if (value === null || String(value).trim() === "") {
		return null;
	}

	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new CommunicationsServiceError(
			`${fieldName} debe ser un entero positivo`,
			400,
			"INVALID_POSITIVE_INTEGER",
		);
	}

	return parsed;
}

function normalizePromotionStatus(
	value: PromotionStatus | undefined,
	required = false,
) {
	if (value === undefined) {
		if (required) {
			throw new CommunicationsServiceError("El estado es obligatorio");
		}

		return undefined;
	}

	if (!PROMOTION_STATUSES.includes(value)) {
		throw new CommunicationsServiceError(
			"El estado de la promocion no es valido",
			400,
			"INVALID_PROMOTION_STATUS",
		);
	}

	return value;
}

function normalizeTrainingEventStatus(
	value: TrainingEventStatus | undefined,
	required = false,
) {
	if (value === undefined) {
		if (required) {
			throw new CommunicationsServiceError("El estado es obligatorio");
		}

		return undefined;
	}

	if (!TRAINING_EVENT_STATUSES.includes(value)) {
		throw new CommunicationsServiceError(
			"El estado de la formacion no es valido",
			400,
			"INVALID_TRAINING_STATUS",
		);
	}

	return value;
}

function normalizeTrainingEventModality(
	value: TrainingEventModality | undefined,
	required = false,
) {
	if (value === undefined) {
		if (required) {
			throw new CommunicationsServiceError("La modalidad es obligatoria");
		}

		return undefined;
	}

	if (!TRAINING_MODALITIES.includes(value)) {
		throw new CommunicationsServiceError(
			"La modalidad de la formacion no es valida",
			400,
			"INVALID_TRAINING_MODALITY",
		);
	}

	return value;
}

function normalizeReminderStatus(
	value: AppReminderStatus | undefined,
	required = false,
) {
	if (value === undefined) {
		if (required) {
			throw new CommunicationsServiceError("El estado es obligatorio");
		}

		return undefined;
	}

	if (!REMINDER_STATUSES.includes(value)) {
		throw new CommunicationsServiceError(
			"El estado del recordatorio no es valido",
			400,
			"INVALID_REMINDER_STATUS",
		);
	}

	return value;
}

function assertPromotionDateRange(startDate: string, endDate: string) {
	if (endDate < startDate) {
		throw new CommunicationsServiceError(
			"La fecha fin debe ser igual o posterior a la fecha de inicio",
			400,
			"INVALID_PROMOTION_DATE_RANGE",
		);
	}
}

function assertPromotionTarget(input: {
	clientId: string | null;
	customerSegmentId: string | null;
}) {
	if (input.clientId && input.customerSegmentId) {
		throw new CommunicationsServiceError(
			"Una promocion no puede estar dirigida simultaneamente a un cliente y a un segmento",
			400,
			"INVALID_PROMOTION_TARGET",
		);
	}
}

async function requireEntityById<T extends { id: string }>(
	manager: EntityManager,
	entity: new () => T,
	id: string,
	message: string,
	code: string,
) {
	const found = await manager.getRepository(entity).findOne({
		where: { id } as object,
	});

	if (!found) {
		throw new CommunicationsServiceError(message, 404, code);
	}

	return found;
}

async function ensurePromotionRelations(
	manager: EntityManager,
	input: {
		productId: string | null;
		productLineId: string | null;
		clientId: string | null;
		customerSegmentId: string | null;
	},
) {
	if (input.productId) {
		await requireEntityById(
			manager,
			Product,
			input.productId,
			"Producto no encontrado",
			"PRODUCT_NOT_FOUND",
		);
	}

	if (input.productLineId) {
		await requireEntityById(
			manager,
			ProductLine,
			input.productLineId,
			"Linea comercial no encontrada",
			"PRODUCT_LINE_NOT_FOUND",
		);
	}

	if (input.clientId) {
		await requireEntityById(
			manager,
			Client,
			input.clientId,
			"Cliente no encontrado",
			"CLIENT_NOT_FOUND",
		);
	}

	if (input.customerSegmentId) {
		await requireEntityById(
			manager,
			CustomerSegment,
			input.customerSegmentId,
			"Segmento no encontrado",
			"CUSTOMER_SEGMENT_NOT_FOUND",
		);
	}
}

async function listActiveUserIdsByRole(
	manager: EntityManager,
	roleIds: number[],
) {
	const users = await manager.getRepository(User).find({
		where: {
			role_id: In(roleIds),
			status_id: USER_STATUS_IDS.ACTIVE,
		},
	});

	return users.map((user) => user.id);
}

async function listPromotionClientRecipientIds(
	manager: EntityManager,
	promotion: Promotion,
) {
	if (promotion.client_id) {
		return listActiveUserIdsByRole(manager, [ROLE_IDS.CLIENT]).then((clientIds) =>
			clientIds.includes(String(promotion.client_id))
				? [String(promotion.client_id)]
				: [],
		);
	}

	if (promotion.customer_segment_id) {
		const rows = await manager
			.getRepository(ClientCustomerSegment)
			.createQueryBuilder("assignment")
			.innerJoin(User, "user", "user.id = assignment.client_id")
			.select("assignment.client_id", "clientId")
			.where("assignment.segment_id = :segmentId", {
				segmentId: promotion.customer_segment_id,
			})
			.andWhere("user.role_id = :clientRole", { clientRole: ROLE_IDS.CLIENT })
			.andWhere("user.status_id = :activeStatus", {
				activeStatus: USER_STATUS_IDS.ACTIVE,
			})
			.getRawMany<{ clientId: string }>();

		return rows.map((row) => row.clientId);
	}

	return listActiveUserIdsByRole(manager, [ROLE_IDS.CLIENT]);
}

async function createRecipientNotifications(
	manager: EntityManager,
	input: {
		title: string;
		body: string;
		notificationType: string;
		sourceType: string;
		sourceId: string;
		recipientUserIds?: string[];
	},
) {
	const targetUserIds = input.recipientUserIds
		? [...new Set(input.recipientUserIds.filter(Boolean))]
		: null;
	const recipients = await manager.getRepository(User).find({
		where: {
			...(targetUserIds ? { id: In(targetUserIds) } : {}),
			role_id: In([ROLE_IDS.CLIENT, ROLE_IDS.COMMERCIAL]),
			status_id: USER_STATUS_IDS.ACTIVE,
		},
	});

	if (!recipients.length) {
		return;
	}

	await manager.getRepository(AppNotification).insert(
		recipients.map((recipient) => ({
			recipient_user_id: recipient.id,
			title: input.title,
			body: input.body,
			notification_type: input.notificationType,
			channel: "in_app",
			source_type: input.sourceType,
			source_id: input.sourceId,
		})),
	);
}

async function notifyPromotionPublished(
	manager: EntityManager,
	promotion: Promotion,
) {
	const clientRecipientIds = await listPromotionClientRecipientIds(
		manager,
		promotion,
	);
	const commercialRecipientIds = await listActiveUserIdsByRole(manager, [
		ROLE_IDS.COMMERCIAL,
	]);

	await createRecipientNotifications(manager, {
		title: `Nueva promocion: ${promotion.title}`,
		body: `${promotion.description} Beneficio: ${promotion.benefit}`,
		notificationType: "promotion",
		sourceType: "promotion",
		sourceId: promotion.id,
		recipientUserIds: [...clientRecipientIds, ...commercialRecipientIds],
	});
}

async function notifyTrainingPublished(
	manager: EntityManager,
	trainingEvent: TrainingEvent,
) {
	await createRecipientNotifications(manager, {
		title: `Nueva formacion: ${trainingEvent.title}`,
		body: trainingEvent.description,
		notificationType: "training",
		sourceType: "training_event",
		sourceId: trainingEvent.id,
	});
}

export async function listCustomerSegments(input: { search?: string | null } = {}) {
	const ds = await getDataSource();
	const query = ds
		.getRepository(CustomerSegment)
		.createQueryBuilder("segment")
		.orderBy("segment.name", "ASC");
	const search = String(input.search ?? "").trim();

	if (search) {
		query.where(
			`(
				segment.code ILIKE :search
				OR segment.name ILIKE :search
				OR COALESCE(segment.description, '') ILIKE :search
				OR COALESCE(segment.criteria, '') ILIKE :search
			)`,
			{ search: `%${search}%` },
		);
	}

	return query.getMany();
}

export async function getCustomerSegmentById(id: string) {
	const ds = await getDataSource();

	return ds.getRepository(CustomerSegment).findOne({
		where: { id },
	});
}

export async function createCustomerSegment(
	input: AdminUpsertCustomerSegmentBody,
) {
	const ds = await getDataSource();
	const code = normalizeCode(input.code, true);
	const name = normalizeText(input.name, "El nombre", { required: true });
	const description = normalizeText(input.description, "La descripcion");
	const criteria = normalizeText(input.criteria, "Los criterios");

	try {
		const created = await ds.transaction(async (manager) => {
			const repo = manager.getRepository(CustomerSegment);
			return repo.save(
				repo.create({
					code: String(code),
					name: String(name),
					description: description ?? null,
					criteria: criteria ?? null,
				}),
			);
		});

		return getCustomerSegmentById(created.id);
	} catch (error) {
		rethrowCommunicationsPersistenceError(
			error,
			"No se pudo crear el segmento",
			"CUSTOMER_SEGMENT_CREATE_FAILED",
		);
	}
}

export async function updateCustomerSegment(
	input: { segmentId: string } & AdminUpsertCustomerSegmentBody,
) {
	const ds = await getDataSource();
	const code = normalizeCode(input.code);
	const name = normalizeText(input.name, "El nombre");
	const description = normalizeText(input.description, "La descripcion");
	const criteria = normalizeText(input.criteria, "Los criterios");

	try {
		const updated = await ds.transaction(async (manager) => {
			const repo = manager.getRepository(CustomerSegment);
			const segment = await repo.findOne({ where: { id: input.segmentId } });

			if (!segment) {
				throw new CommunicationsServiceError(
					"Segmento no encontrado",
					404,
					"CUSTOMER_SEGMENT_NOT_FOUND",
				);
			}

			if (code !== undefined) {
				segment.code = String(code);
			}

			if (name !== undefined) {
				segment.name = String(name);
			}

			if (description !== undefined) {
				segment.description = description;
			}

			if (criteria !== undefined) {
				segment.criteria = criteria;
			}

			return repo.save(segment);
		});

		return getCustomerSegmentById(updated.id);
	} catch (error) {
		rethrowCommunicationsPersistenceError(
			error,
			"No se pudo actualizar el segmento",
			"CUSTOMER_SEGMENT_UPDATE_FAILED",
		);
	}
}

export async function deleteCustomerSegment(segmentId: string) {
	const ds = await getDataSource();
	const result = await ds.getRepository(CustomerSegment).delete({ id: segmentId });

	if (!result.affected) {
		throw new CommunicationsServiceError(
			"Segmento no encontrado",
			404,
			"CUSTOMER_SEGMENT_NOT_FOUND",
		);
	}

	return { id: segmentId };
}

export async function listClientSegmentAssignments(
	input: { search?: string | null } = {},
) {
	const ds = await getDataSource();
	const query = ds
		.getRepository(ClientCustomerSegment)
		.createQueryBuilder("assignment")
		.leftJoinAndSelect("assignment.client", "client")
		.leftJoinAndSelect("client.user", "clientUser")
		.leftJoinAndSelect("assignment.segment", "segment")
		.leftJoinAndSelect("assignment.assignedByUser", "assignedByUser")
		.orderBy("assignment.created_at", "DESC");
	const search = String(input.search ?? "").trim();

	if (search) {
		query.where(
			`(
				client.name ILIKE :search
				OR COALESCE(client.contact_name, '') ILIKE :search
				OR COALESCE(clientUser.email, '') ILIKE :search
				OR segment.name ILIKE :search
				OR segment.code ILIKE :search
			)`,
			{ search: `%${search}%` },
		);
	}

	return query.getMany();
}

export async function assignClientToSegment(
	input: AdminAssignClientSegmentBody & { assignedByUserId?: string | null },
) {
	const ds = await getDataSource();
	const clientId = normalizeOptionalId(input.clientId);
	const segmentId = normalizeOptionalId(input.segmentId);
	const notes = normalizeText(input.notes, "Las notas");

	if (!clientId) {
		throw new CommunicationsServiceError("El cliente es obligatorio");
	}

	if (!segmentId) {
		throw new CommunicationsServiceError("El segmento es obligatorio");
	}

	try {
		const created = await ds.transaction(async (manager) => {
			await requireEntityById(
				manager,
				Client,
				clientId,
				"Cliente no encontrado",
				"CLIENT_NOT_FOUND",
			);
			await requireEntityById(
				manager,
				CustomerSegment,
				segmentId,
				"Segmento no encontrado",
				"CUSTOMER_SEGMENT_NOT_FOUND",
			);

			const repo = manager.getRepository(ClientCustomerSegment);

			return repo.save(
				repo.create({
					client_id: clientId,
					segment_id: segmentId,
					assigned_by_user_id: input.assignedByUserId ?? null,
					notes: notes ?? null,
				}),
			);
		});

		return created;
	} catch (error) {
		rethrowCommunicationsPersistenceError(
			error,
			"No se pudo asignar el cliente al segmento",
			"CLIENT_SEGMENT_ASSIGNMENT_FAILED",
		);
	}
}

export async function removeClientSegmentAssignment(assignmentId: string) {
	const ds = await getDataSource();
	const result = await ds
		.getRepository(ClientCustomerSegment)
		.delete({ id: assignmentId });

	if (!result.affected) {
		throw new CommunicationsServiceError(
			"Asignacion no encontrada",
			404,
			"CLIENT_SEGMENT_ASSIGNMENT_NOT_FOUND",
		);
	}

	return { id: assignmentId };
}

export async function listAdminPromotions(input: { search?: string | null } = {}) {
	const ds = await getDataSource();
	const query = ds
		.getRepository(Promotion)
		.createQueryBuilder("promotion")
		.leftJoinAndSelect("promotion.product", "product")
		.leftJoinAndSelect("promotion.productLine", "productLine")
		.leftJoinAndSelect("promotion.client", "client")
		.leftJoinAndSelect("promotion.customerSegment", "segment")
		.leftJoinAndSelect("promotion.createdByUser", "createdByUser")
		.orderBy("promotion.created_at", "DESC");
	const search = String(input.search ?? "").trim();

	if (search) {
		query.where(
			`(
				promotion.title ILIKE :search
				OR promotion.description ILIKE :search
				OR promotion.promotion_type ILIKE :search
				OR promotion.benefit ILIKE :search
				OR COALESCE(product.name, '') ILIKE :search
				OR COALESCE(productLine.name, '') ILIKE :search
				OR COALESCE(client.name, '') ILIKE :search
				OR COALESCE(segment.name, '') ILIKE :search
			)`,
			{ search: `%${search}%` },
		);
	}

	return query.getMany();
}

export async function getPromotionById(id: string) {
	const ds = await getDataSource();

	return ds
		.getRepository(Promotion)
		.createQueryBuilder("promotion")
		.leftJoinAndSelect("promotion.product", "product")
		.leftJoinAndSelect("promotion.productLine", "productLine")
		.leftJoinAndSelect("promotion.client", "client")
		.leftJoinAndSelect("promotion.customerSegment", "segment")
		.leftJoinAndSelect("promotion.createdByUser", "createdByUser")
		.where("promotion.id = :id", { id })
		.getOne();
}

export async function createPromotion(
	input: AdminUpsertPromotionBody & { createdByUserId?: string | null },
) {
	const ds = await getDataSource();
	const title = normalizeText(input.title, "El titulo", { required: true });
	const description = normalizeText(input.description, "La descripcion", {
		required: true,
	});
	const promotionType = normalizeText(input.promotionType, "El tipo", {
		required: true,
	});
	const benefit = normalizeText(input.benefit, "El beneficio", {
		required: true,
	});
	const startDate = normalizeDateOnly(input.startDate, "La fecha de inicio", {
		required: true,
	});
	const endDate = normalizeDateOnly(input.endDate, "La fecha fin", {
		required: true,
	});
	const status = normalizePromotionStatus(input.status) ?? "draft";
	const productId = normalizeOptionalId(input.productId) ?? null;
	const productLineId = normalizeOptionalId(input.productLineId) ?? null;
	const clientId = normalizeOptionalId(input.clientId) ?? null;
	const customerSegmentId = normalizeOptionalId(input.customerSegmentId) ?? null;

	assertPromotionDateRange(String(startDate), String(endDate));
	assertPromotionTarget({ clientId, customerSegmentId });

	try {
		const created = await ds.transaction(async (manager) => {
			await ensurePromotionRelations(manager, {
				productId,
				productLineId,
				clientId,
				customerSegmentId,
			});

			const repo = manager.getRepository(Promotion);
			const promotion = await repo.save(
				repo.create({
					title: String(title),
					description: String(description),
					promotion_type: String(promotionType),
					benefit: String(benefit),
					start_date: String(startDate),
					end_date: String(endDate),
					status,
					product_id: productId,
					product_line_id: productLineId,
					client_id: clientId,
					customer_segment_id: customerSegmentId,
					created_by_user_id: input.createdByUserId ?? null,
				}),
			);

			if (promotion.status === "active") {
				await notifyPromotionPublished(manager, promotion);
			}

			return promotion;
		});

		return getPromotionById(created.id);
	} catch (error) {
		rethrowCommunicationsPersistenceError(
			error,
			"No se pudo crear la promocion",
			"PROMOTION_CREATE_FAILED",
		);
	}
}

export async function updatePromotion(
	input: { promotionId: string } & AdminUpsertPromotionBody,
) {
	const ds = await getDataSource();
	const normalized = {
		title: normalizeText(input.title, "El titulo"),
		description: normalizeText(input.description, "La descripcion"),
		promotionType: normalizeText(input.promotionType, "El tipo"),
		benefit: normalizeText(input.benefit, "El beneficio"),
		startDate: normalizeDateOnly(input.startDate, "La fecha de inicio"),
		endDate: normalizeDateOnly(input.endDate, "La fecha fin"),
		status: normalizePromotionStatus(input.status),
		productId: normalizeOptionalId(input.productId),
		productLineId: normalizeOptionalId(input.productLineId),
		clientId: normalizeOptionalId(input.clientId),
		customerSegmentId: normalizeOptionalId(input.customerSegmentId),
	};

	try {
		const updated = await ds.transaction(async (manager) => {
			const repo = manager.getRepository(Promotion);
			const promotion = await repo.findOne({
				where: { id: input.promotionId },
			});

			if (!promotion) {
				throw new CommunicationsServiceError(
					"Promocion no encontrada",
					404,
					"PROMOTION_NOT_FOUND",
				);
			}

			const wasActive = promotion.status === "active";
			const nextValues = {
				title: normalized.title ?? promotion.title,
				description: normalized.description ?? promotion.description,
				promotionType: normalized.promotionType ?? promotion.promotion_type,
				benefit: normalized.benefit ?? promotion.benefit,
				startDate: normalized.startDate ?? promotion.start_date,
				endDate: normalized.endDate ?? promotion.end_date,
				status: normalized.status ?? promotion.status,
				productId:
					normalized.productId !== undefined
						? normalized.productId
						: promotion.product_id,
				productLineId:
					normalized.productLineId !== undefined
						? normalized.productLineId
						: promotion.product_line_id,
				clientId:
					normalized.clientId !== undefined
						? normalized.clientId
						: promotion.client_id,
				customerSegmentId:
					normalized.customerSegmentId !== undefined
						? normalized.customerSegmentId
						: promotion.customer_segment_id,
			};

			assertPromotionDateRange(nextValues.startDate, nextValues.endDate);
			assertPromotionTarget({
				clientId: nextValues.clientId,
				customerSegmentId: nextValues.customerSegmentId,
			});
			await ensurePromotionRelations(manager, nextValues);

			promotion.title = String(nextValues.title);
			promotion.description = String(nextValues.description);
			promotion.promotion_type = String(nextValues.promotionType);
			promotion.benefit = String(nextValues.benefit);
			promotion.start_date = nextValues.startDate;
			promotion.end_date = nextValues.endDate;
			promotion.status = nextValues.status;
			promotion.product_id = nextValues.productId;
			promotion.product_line_id = nextValues.productLineId;
			promotion.client_id = nextValues.clientId;
			promotion.customer_segment_id = nextValues.customerSegmentId;

			const saved = await repo.save(promotion);

			if (!wasActive && saved.status === "active") {
				await notifyPromotionPublished(manager, saved);
			}

			return saved;
		});

		return getPromotionById(updated.id);
	} catch (error) {
		rethrowCommunicationsPersistenceError(
			error,
			"No se pudo actualizar la promocion",
			"PROMOTION_UPDATE_FAILED",
		);
	}
}

export async function deletePromotion(promotionId: string) {
	const ds = await getDataSource();
	const result = await ds.getRepository(Promotion).delete({ id: promotionId });

	if (!result.affected) {
		throw new CommunicationsServiceError(
			"Promocion no encontrada",
			404,
			"PROMOTION_NOT_FOUND",
		);
	}

	return { id: promotionId };
}

export async function listPromotionsForUser(input: {
	userId: string;
	role: string;
}) {
	const ds = await getDataSource();
	const today = new Date().toISOString().slice(0, 10);
	const query = ds
		.getRepository(Promotion)
		.createQueryBuilder("promotion")
		.leftJoinAndSelect("promotion.product", "product")
		.leftJoinAndSelect("promotion.productLine", "productLine")
		.leftJoinAndSelect("promotion.client", "client")
		.leftJoinAndSelect("promotion.customerSegment", "segment")
		.where("promotion.status = :status", { status: "active" })
		.andWhere("promotion.start_date <= :today", { today })
		.andWhere("promotion.end_date >= :today", { today })
		.orderBy("promotion.end_date", "ASC")
		.addOrderBy("promotion.title", "ASC");

	if (input.role === "client") {
		query
			.leftJoin(
				ClientCustomerSegment,
				"clientSegment",
				`clientSegment.segment_id = promotion.customer_segment_id
				AND clientSegment.client_id = :userId`,
				{ userId: input.userId },
			)
			.andWhere(
				`(
					(promotion.client_id IS NULL AND promotion.customer_segment_id IS NULL)
					OR promotion.client_id = :userId
					OR clientSegment.id IS NOT NULL
				)`,
				{ userId: input.userId },
			);
	}

	return query.getMany();
}

export async function listAdminTrainingEvents(
	input: { search?: string | null } = {},
) {
	const ds = await getDataSource();
	const query = ds
		.getRepository(TrainingEvent)
		.createQueryBuilder("trainingEvent")
		.leftJoinAndSelect("trainingEvent.enrollments", "enrollment")
		.leftJoinAndSelect("enrollment.user", "enrollmentUser")
		.leftJoinAndSelect("trainingEvent.createdByUser", "createdByUser")
		.orderBy("trainingEvent.starts_at", "DESC");
	const search = String(input.search ?? "").trim();

	if (search) {
		query.where(
			`(
				trainingEvent.title ILIKE :search
				OR trainingEvent.description ILIKE :search
				OR COALESCE(trainingEvent.location, '') ILIKE :search
				OR COALESCE(trainingEvent.content, '') ILIKE :search
			)`,
			{ search: `%${search}%` },
		);
	}

	return query.getMany();
}

export async function getTrainingEventById(id: string) {
	const ds = await getDataSource();

	return ds
		.getRepository(TrainingEvent)
		.createQueryBuilder("trainingEvent")
		.leftJoinAndSelect("trainingEvent.enrollments", "enrollment")
		.leftJoinAndSelect("enrollment.user", "enrollmentUser")
		.leftJoinAndSelect("trainingEvent.createdByUser", "createdByUser")
		.where("trainingEvent.id = :id", { id })
		.getOne();
}

export async function createTrainingEvent(
	input: AdminUpsertTrainingEventBody & { createdByUserId?: string | null },
) {
	const ds = await getDataSource();
	const title = normalizeText(input.title, "El titulo", { required: true });
	const description = normalizeText(input.description, "La descripcion", {
		required: true,
	});
	const startsAt = normalizeDateTime(input.startsAt, "La fecha de inicio", {
		required: true,
	});
	const location = normalizeText(input.location, "La ubicacion");
	const modality = normalizeTrainingEventModality(input.modality) ?? "in_person";
	const content = normalizeText(input.content, "El contenido");
	const status = normalizeTrainingEventStatus(input.status) ?? "draft";
	const capacity = normalizePositiveInteger(input.capacity, "La capacidad");

	try {
		const created = await ds.transaction(async (manager) => {
			const repo = manager.getRepository(TrainingEvent);
			const trainingEvent = await repo.save(
				repo.create({
					title: String(title),
					description: String(description),
					starts_at: startsAt as Date,
					location: location ?? null,
					modality,
					content: content ?? null,
					status,
					capacity: capacity ?? null,
					created_by_user_id: input.createdByUserId ?? null,
				}),
			);

			if (trainingEvent.status === "published") {
				await notifyTrainingPublished(manager, trainingEvent);
			}

			return trainingEvent;
		});

		return getTrainingEventById(created.id);
	} catch (error) {
		rethrowCommunicationsPersistenceError(
			error,
			"No se pudo crear la formacion",
			"TRAINING_CREATE_FAILED",
		);
	}
}

export async function updateTrainingEvent(
	input: { trainingEventId: string } & AdminUpsertTrainingEventBody,
) {
	const ds = await getDataSource();
	const normalized = {
		title: normalizeText(input.title, "El titulo"),
		description: normalizeText(input.description, "La descripcion"),
		startsAt: normalizeDateTime(input.startsAt, "La fecha de inicio"),
		location: normalizeText(input.location, "La ubicacion"),
		modality: normalizeTrainingEventModality(input.modality),
		content: normalizeText(input.content, "El contenido"),
		status: normalizeTrainingEventStatus(input.status),
		capacity: normalizePositiveInteger(input.capacity, "La capacidad"),
	};

	try {
		const updated = await ds.transaction(async (manager) => {
			const repo = manager.getRepository(TrainingEvent);
			const trainingEvent = await repo.findOne({
				where: { id: input.trainingEventId },
			});

			if (!trainingEvent) {
				throw new CommunicationsServiceError(
					"Formacion no encontrada",
					404,
					"TRAINING_NOT_FOUND",
				);
			}

			const wasPublished = trainingEvent.status === "published";

			if (normalized.title !== undefined) {
				trainingEvent.title = String(normalized.title);
			}

			if (normalized.description !== undefined) {
				trainingEvent.description = String(normalized.description);
			}

			if (normalized.startsAt !== undefined) {
				trainingEvent.starts_at = normalized.startsAt as Date;
			}

			if (normalized.location !== undefined) {
				trainingEvent.location = normalized.location;
			}

			if (normalized.modality !== undefined) {
				trainingEvent.modality = normalized.modality;
			}

			if (normalized.content !== undefined) {
				trainingEvent.content = normalized.content;
			}

			if (normalized.status !== undefined) {
				trainingEvent.status = normalized.status;
			}

			if (normalized.capacity !== undefined) {
				trainingEvent.capacity = normalized.capacity;
			}

			const saved = await repo.save(trainingEvent);

			if (!wasPublished && saved.status === "published") {
				await notifyTrainingPublished(manager, saved);
			}

			return saved;
		});

		return getTrainingEventById(updated.id);
	} catch (error) {
		rethrowCommunicationsPersistenceError(
			error,
			"No se pudo actualizar la formacion",
			"TRAINING_UPDATE_FAILED",
		);
	}
}

export async function deleteTrainingEvent(trainingEventId: string) {
	const ds = await getDataSource();
	const result = await ds
		.getRepository(TrainingEvent)
		.delete({ id: trainingEventId });

	if (!result.affected) {
		throw new CommunicationsServiceError(
			"Formacion no encontrada",
			404,
			"TRAINING_NOT_FOUND",
		);
	}

	return { id: trainingEventId };
}

export async function listTrainingEventsForUser(userId: string) {
	const ds = await getDataSource();

	return ds
		.getRepository(TrainingEvent)
		.createQueryBuilder("trainingEvent")
		.leftJoinAndSelect(
			"trainingEvent.enrollments",
			"enrollment",
			"enrollment.user_id = :userId",
			{ userId },
		)
		.where("trainingEvent.status = :status", { status: "published" })
		.orderBy("trainingEvent.starts_at", "ASC")
		.getMany();
}

export async function enrollTrainingEvent(
	input: { userId: string; trainingEventId: string } & TrainingEnrollmentBody,
) {
	const ds = await getDataSource();
	const notes = normalizeText(input.notes, "Las notas");

	try {
		return ds.transaction(async (manager) => {
			const eventRepo = manager.getRepository(TrainingEvent);
			const enrollmentRepo = manager.getRepository(TrainingEnrollment);
			const trainingEvent = await eventRepo.findOne({
				where: { id: input.trainingEventId },
			});

			if (!trainingEvent) {
				throw new CommunicationsServiceError(
					"Formacion no encontrada",
					404,
					"TRAINING_NOT_FOUND",
				);
			}

			if (trainingEvent.status !== "published") {
				throw new CommunicationsServiceError(
					"Solo puedes inscribirte en formaciones publicadas",
					400,
					"TRAINING_NOT_PUBLISHED",
				);
			}

			const existing = await enrollmentRepo.findOne({
				where: {
					training_event_id: input.trainingEventId,
					user_id: input.userId,
				},
			});
			const isAlreadyActive = existing
				? ACTIVE_ENROLLMENT_STATUS_SET.has(existing.status)
				: false;

			if (!isAlreadyActive && trainingEvent.capacity) {
				const activeCount = await enrollmentRepo.count({
					where: {
						training_event_id: input.trainingEventId,
						status: In([...ACTIVE_ENROLLMENT_STATUSES]),
					},
				});

				if (activeCount >= trainingEvent.capacity) {
					throw new CommunicationsServiceError(
						"La formacion no tiene plazas disponibles",
						409,
						"TRAINING_CAPACITY_FULL",
					);
				}
			}

			if (existing) {
				existing.status = "registered";
				existing.notes = notes ?? existing.notes;
				return enrollmentRepo.save(existing);
			}

			return enrollmentRepo.save(
				enrollmentRepo.create({
					training_event_id: input.trainingEventId,
					user_id: input.userId,
					status: "registered",
					notes: notes ?? null,
				}),
			);
		});
	} catch (error) {
		rethrowCommunicationsPersistenceError(
			error,
			"No se pudo registrar la inscripcion",
			"TRAINING_ENROLLMENT_FAILED",
		);
	}
}

export async function cancelTrainingEnrollment(input: {
	userId: string;
	trainingEventId: string;
}) {
	const ds = await getDataSource();
	const enrollment = await ds.getRepository(TrainingEnrollment).findOne({
		where: {
			training_event_id: input.trainingEventId,
			user_id: input.userId,
		},
	});

	if (!enrollment) {
		throw new CommunicationsServiceError(
			"Inscripcion no encontrada",
			404,
			"TRAINING_ENROLLMENT_NOT_FOUND",
		);
	}

	enrollment.status = "cancelled";
	return ds.getRepository(TrainingEnrollment).save(enrollment);
}

export async function listNotificationsForUser(userId: string) {
	const ds = await getDataSource();

	return ds
		.getRepository(AppNotification)
		.createQueryBuilder("notification")
		.where("notification.recipient_user_id = :userId", { userId })
		.orderBy("notification.read_at IS NULL", "DESC")
		.addOrderBy("notification.created_at", "DESC")
		.getMany();
}

export async function markNotificationRead(input: {
	userId: string;
	notificationId: string;
}) {
	const ds = await getDataSource();
	const repo = ds.getRepository(AppNotification);
	const notification = await repo.findOne({
		where: {
			id: input.notificationId,
			recipient_user_id: input.userId,
		},
	});

	if (!notification) {
		throw new CommunicationsServiceError(
			"Notificacion no encontrada",
			404,
			"NOTIFICATION_NOT_FOUND",
		);
	}

	notification.read_at = notification.read_at ?? new Date();
	return repo.save(notification);
}

export async function markAllNotificationsRead(userId: string) {
	const ds = await getDataSource();

	await ds
		.getRepository(AppNotification)
		.createQueryBuilder()
		.update(AppNotification)
		.set({ read_at: new Date() })
		.where("recipient_user_id = :userId", { userId })
		.andWhere("read_at IS NULL")
		.execute();

	return { ok: true };
}

export async function listRemindersForUser(userId: string) {
	const ds = await getDataSource();

	return ds.getRepository(AppReminder).find({
		where: { recipient_user_id: userId },
		order: {
			status: "ASC",
			scheduled_at: "ASC",
		},
	});
}

export async function createReminderForUser(
	userId: string,
	input: UpsertAppReminderBody,
) {
	const ds = await getDataSource();
	const title = normalizeText(input.title, "El titulo", { required: true });
	const body = normalizeText(input.body, "El cuerpo", { required: true });
	const scheduledAt = normalizeDateTime(input.scheduledAt, "La fecha programada", {
		required: true,
	});

	return ds.getRepository(AppReminder).save(
		ds.getRepository(AppReminder).create({
			recipient_user_id: userId,
			title: String(title),
			body: String(body),
			scheduled_at: scheduledAt as Date,
			status: "pending",
			source_type: "manual",
			source_id: null,
		}),
	);
}

export async function updateReminderStatus(input: {
	userId: string;
	reminderId: string;
	status: AppReminderStatus;
}) {
	const ds = await getDataSource();
	const status = normalizeReminderStatus(input.status, true);
	const repo = ds.getRepository(AppReminder);
	const reminder = await repo.findOne({
		where: {
			id: input.reminderId,
			recipient_user_id: input.userId,
		},
	});

	if (!reminder) {
		throw new CommunicationsServiceError(
			"Recordatorio no encontrado",
			404,
			"REMINDER_NOT_FOUND",
		);
	}

	reminder.status = status as AppReminderStatus;
	return repo.save(reminder);
}
