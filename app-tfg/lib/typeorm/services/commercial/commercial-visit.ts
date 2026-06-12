import { getDataSource } from "@/lib/typeorm/data-source";
import type {
	CommercialVisitDeliveryOrder,
	CommercialVisitDetail,
} from "@/lib/contracts/commercial-visit";
import { CommercialVisit } from "@/lib/typeorm/entities/CommercialVisit";
import { Client } from "@/lib/typeorm/entities/Client";
import { Commercial } from "@/lib/typeorm/entities/Commercial";
import { Order } from "@/lib/typeorm/entities/Order";
import { OrderDelivery } from "@/lib/typeorm/entities/OrderDelivery";
import { Repository } from "typeorm";
import {
	COMMERCIAL_VISIT_STATUS_IDS,
	COMMERCIAL_VISIT_TYPE_IDS,
	ORDER_STATUS_IDS,
} from "@/lib/typeorm/constants/catalog-ids";
import {
	extractOrderDeliveryIdFromQrValue,
	extractOrderIdFromQrValue,
	normalizeOrderDeliveryQrValues,
	normalizeOrderQrValues,
} from "@/lib/orders/qr";
import {
	listAvailableOrderDeliveriesForVisit,
	loadOrderDeliveriesByIdsForVisitValidation,
	mapOrderDeliveryToSummary,
	syncOrderDeliveredStatusFromDeliveries,
} from "@/lib/typeorm/services/orders/order-delivery";
import { getActiveAssignmentByCommercialAndClient } from "@/lib/typeorm/services/commercial/client-commercial-assignment";
import { normalizeText } from "@/lib/utils/text";
import { parseTimeToMinutes } from "@/lib/utils/time";
import {
	notifyClientVisitCreated,
	notifyClientVisitRescheduled,
	notifyCommercialVisitsAutoPostponed,
} from "./visit-notifications";

// --------------------------------------------------------------------------
// Funciones auxiliares para normalización de datos
// --------------------------------------------------------------------------

function normalizeDateOnly(value: string | null | undefined) {
	const normalized = String(value ?? "").trim();

	if (!normalized) {
		return null;
	}

	if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
		throw new CreateCommercialVisitError(
			"La fecha de la visita debe usar el formato YYYY-MM-DD",
			400,
			"INVALID_VISIT_DATE_FORMAT",
		);
	}

	return normalized;
}

function normalizeDateOnlyForUpdate(value: string | null | undefined) {
	const normalized = String(value ?? "").trim();

	if (!normalized) {
		return null;
	}

	if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
		throw new UpdateCommercialVisitError(
			"La fecha de la visita debe usar el formato YYYY-MM-DD",
			400,
			"INVALID_VISIT_DATE_FORMAT",
		);
	}

	return normalized;
}

function getMadridClock(date = new Date()) {
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone: "Europe/Madrid",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
	}).formatToParts(date);

	const year = parts.find((part) => part.type === "year")?.value ?? "1970";
	const month = parts.find((part) => part.type === "month")?.value ?? "01";
	const day = parts.find((part) => part.type === "day")?.value ?? "01";
	const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
	const minute = Number(
		parts.find((part) => part.type === "minute")?.value ?? "0",
	);

	return {
		date: `${year}-${month}-${day}`,
		totalMinutes: hour * 60 + minute,
	};
}

function buildCommercialVisitQuery(repo: Repository<CommercialVisit>) {
	return repo
		.createQueryBuilder("visit")
		.leftJoinAndSelect("visit.client", "client")
		.leftJoinAndSelect("client.user", "user")
		.leftJoinAndSelect("visit.commercial", "commercial")
		.leftJoinAndSelect("commercial.user", "commercialUser")
		.leftJoinAndSelect("visit.visitType", "visitType")
		.leftJoinAndSelect("visit.status", "status");
}

function toIsoString(value: Date | string | null | undefined) {
	if (!value) {
		return "";
	}

	return value instanceof Date ? value.toISOString() : String(value);
}

function mapOrderToDeliveryOrderSummary(order: Order): CommercialVisitDeliveryOrder {
	return {
		id: order.id,
		delivery_visit_id: order.delivery_visit_id ?? null,
		status_id: order.status_id,
		status_name: order.status?.name ?? "Sin estado",
		total_amount: String(order.total_amount ?? "0.00"),
		notes: order.notes ?? null,
		created_at: toIsoString(order.created_at),
		updated_at: toIsoString(order.updated_at),
		line_count: Array.isArray(order.lines)
			? order.lines.reduce(
					(total, line) => total + Number(line.quantity ?? 0),
					0,
				)
			: 0,
	};
}

function normalizeOrderIds(orderIds: string[] | null | undefined) {
	return Array.from(
		new Set(
			(Array.isArray(orderIds) ? orderIds : [])
				.map((orderId) => String(orderId ?? "").trim())
				.filter(Boolean),
		),
	);
}

function normalizeDeliveryIds(deliveryIds: string[] | null | undefined) {
	return Array.from(
		new Set(
			(Array.isArray(deliveryIds) ? deliveryIds : [])
				.map((deliveryId) => String(deliveryId ?? "").trim())
				.filter(Boolean),
		),
	);
}

function validateDeliveredOrderQrs(
	finalAssignedOrderIds: string[],
	deliveredOrderQrs: string[] | null | undefined,
) {
	const scannedOrderIds = normalizeOrderQrValues(deliveredOrderQrs);

	if (finalAssignedOrderIds.length === 0) {
		return [] as string[];
	}

	if (scannedOrderIds.length === 0) {
		throw new UpdateCommercialVisitError(
			"Debes escanear o pegar los QR de todos los paquetes antes de completar el reparto",
			409,
			"DELIVERY_VISIT_QR_REQUIRED",
		);
	}

	if (
		scannedOrderIds.length !== finalAssignedOrderIds.length ||
		finalAssignedOrderIds.some(
			(orderId) => !scannedOrderIds.includes(orderId),
		)
	) {
		throw new UpdateCommercialVisitError(
			"Los QR escaneados no coinciden con todos los pedidos vinculados al reparto",
			409,
			"DELIVERY_VISIT_QR_MISMATCH",
		);
	}

	return scannedOrderIds;
}

function validateDeliveredDeliveryQrs(
	finalAssignedDeliveryIds: string[],
	deliveredDeliveryQrs: string[] | null | undefined,
) {
	const scannedDeliveryIds = normalizeOrderDeliveryQrValues(deliveredDeliveryQrs);

	if (finalAssignedDeliveryIds.length === 0) {
		return [] as string[];
	}

	if (scannedDeliveryIds.length === 0) {
		throw new UpdateCommercialVisitError(
			"Debes escanear o pegar los QR de todos los repartos antes de completar la visita",
			409,
			"DELIVERY_VISIT_QR_REQUIRED",
		);
	}

	if (
		scannedDeliveryIds.length !== finalAssignedDeliveryIds.length ||
		finalAssignedDeliveryIds.some(
			(deliveryId) => !scannedDeliveryIds.includes(deliveryId),
		)
	) {
		throw new UpdateCommercialVisitError(
			"Los QR escaneados no coinciden con todos los repartos vinculados a la visita",
			409,
			"DELIVERY_VISIT_QR_MISMATCH",
		);
	}

	return scannedDeliveryIds;
}

async function validateOrderDeliveryIdsForVisit(
	manager: Awaited<ReturnType<typeof getDataSource>>["manager"],
	input: {
		clientId: string;
		visitId?: string | null;
		deliveryIds?: string[] | null;
		errorFactory?: (message: string, status: number, code: string) => Error;
	},
) {
	const normalizedDeliveryIds = normalizeDeliveryIds(input.deliveryIds);
	const createError =
		input.errorFactory ??
		((message: string, status: number, code: string) =>
			new UpdateCommercialVisitError(message, status, code));

	if (normalizedDeliveryIds.length === 0) {
		return [] as string[];
	}

	const selectedDeliveries = await loadOrderDeliveriesByIdsForVisitValidation(
		manager,
		normalizedDeliveryIds,
	);

	if (selectedDeliveries.length !== normalizedDeliveryIds.length) {
		throw createError(
			"Uno o varios repartos indicados no existen",
			404,
			"VISIT_DELIVERY_NOT_FOUND",
		);
	}

	for (const delivery of selectedDeliveries) {
		if (delivery.order?.client_id !== input.clientId) {
			throw createError(
				"Solo puedes vincular repartos del mismo cliente de la visita",
				409,
				"VISIT_DELIVERY_CLIENT_MISMATCH",
			);
		}

		if (delivery.order?.status_id !== ORDER_STATUS_IDS.CONFIRMED) {
			throw createError(
				"Solo se pueden vincular repartos de pedidos confirmados",
				409,
				"VISIT_DELIVERY_ORDER_STATUS_INVALID",
			);
		}

		if (delivery.status === "delivered") {
			throw createError(
				"Hay repartos seleccionados que ya constan como entregados",
				409,
				"VISIT_DELIVERY_ALREADY_DELIVERED",
			);
		}

		if (delivery.status === "cancelled") {
			throw createError(
				"Hay repartos seleccionados que estan cancelados",
				409,
				"VISIT_DELIVERY_CANCELLED",
			);
		}

		if (
			delivery.delivery_visit_id &&
			delivery.delivery_visit_id !== (input.visitId ?? null)
		) {
			if (
				delivery.deliveryVisit?.status_id !==
				COMMERCIAL_VISIT_STATUS_IDS.POSTPONED
			) {
				throw createError(
					"Hay repartos seleccionados que ya estan asignados a otra visita",
					409,
					"VISIT_DELIVERY_ALREADY_ASSIGNED",
				);
			}
		}
	}

	return normalizedDeliveryIds;
}

async function validateDeliveryOrderIdsForVisit(
	manager: Awaited<ReturnType<typeof getDataSource>>["manager"],
	input: {
		clientId: string;
		visitId?: string | null;
		orderIds?: string[] | null;
		errorFactory?: (message: string, status: number, code: string) => Error;
	},
) {
	const normalizedOrderIds = normalizeOrderIds(input.orderIds);
	const createError =
		input.errorFactory ??
		((message: string, status: number, code: string) =>
			new UpdateCommercialVisitError(message, status, code));

	if (normalizedOrderIds.length === 0) {
		return [] as string[];
	}

	const orderRepo = manager.getRepository(Order);
	const selectedOrders = await orderRepo
		.createQueryBuilder("order")
		.leftJoinAndSelect("order.deliveryVisit", "deliveryVisit")
		.where("order.id IN (:...orderIds)", {
			orderIds: normalizedOrderIds,
		})
		.getMany();

	if (selectedOrders.length !== normalizedOrderIds.length) {
		throw createError(
			"Uno o varios pedidos indicados no existen",
			404,
			"VISIT_ORDER_NOT_FOUND",
		);
	}

	for (const order of selectedOrders) {
		if (order.client_id !== input.clientId) {
			throw createError(
				"Solo puedes vincular pedidos del mismo cliente de la visita",
				409,
				"VISIT_ORDER_CLIENT_MISMATCH",
			);
		}

		const isCurrentVisitOrder =
			Boolean(input.visitId) && order.delivery_visit_id === input.visitId;

		if (
			order.status_id !== ORDER_STATUS_IDS.CONFIRMED &&
			!(
				isCurrentVisitOrder &&
				order.status_id === ORDER_STATUS_IDS.DELIVERED
			)
		) {
			throw createError(
				"Solo se pueden vincular pedidos confirmados a un reparto",
				409,
				"VISIT_ORDER_STATUS_INVALID",
			);
		}

		if (
			order.delivery_visit_id &&
			order.delivery_visit_id !== (input.visitId ?? null)
		) {
			if (
				order.deliveryVisit?.status_id !==
				COMMERCIAL_VISIT_STATUS_IDS.POSTPONED
			) {
				throw createError(
					"Hay pedidos seleccionados que ya estan asignados a otro reparto",
					409,
					"VISIT_ORDER_ALREADY_ASSIGNED",
				);
			}
		}
	}

	return normalizedOrderIds;
}

function isValidCommercialVisitStatus(statusId: number) {
	return Object.values(COMMERCIAL_VISIT_STATUS_IDS).includes(
		statusId as (typeof COMMERCIAL_VISIT_STATUS_IDS)[keyof typeof COMMERCIAL_VISIT_STATUS_IDS],
	);
}

function isValidCommercialVisitType(visitTypeId: number) {
	return Object.values(COMMERCIAL_VISIT_TYPE_IDS).includes(
		visitTypeId as (typeof COMMERCIAL_VISIT_TYPE_IDS)[keyof typeof COMMERCIAL_VISIT_TYPE_IDS],
	);
}

function canTransitionCommercialVisitStatus(
	currentStatusId: number,
	nextStatusId: number,
) {
	if (currentStatusId === nextStatusId) {
		return true;
	}

	if (currentStatusId === COMMERCIAL_VISIT_STATUS_IDS.PLANNED) {
		return (
			nextStatusId === COMMERCIAL_VISIT_STATUS_IDS.POSTPONED ||
			nextStatusId === COMMERCIAL_VISIT_STATUS_IDS.COMPLETED ||
			nextStatusId === COMMERCIAL_VISIT_STATUS_IDS.CANCELLED
		);
	}

	if (currentStatusId === COMMERCIAL_VISIT_STATUS_IDS.POSTPONED) {
		return false;
	}

	return false;
}

function canEditCommercialVisitPlanning(statusId: number) {
	return statusId === COMMERCIAL_VISIT_STATUS_IDS.PLANNED;
}

// --------------------------------------------------------------------------
// Tipos de datos para los inputs de los servicios
// --------------------------------------------------------------------------

type CreateCommercialVisitInput = {
	clientId: string;
	commercialId: string;
	scheduledForDate: string;
	visitTypeId: number;
	notes?: string | null;
	orderIds?: string[] | null;
	deliveryIds?: string[] | null;
};

type UpdateCommercialVisitInput = {
	visitId: string;
	commercialId: string;
	actedByUserId?: string | null;
	deliveredOrderQrs?: string[] | null;
	deliveredDeliveryQrs?: string[] | null;
	scannedOrderQr?: string | null;
	scannedDeliveryQr?: string | null;
	scheduledForDate?: string;
	visitTypeId?: number;
	statusId?: number;
	notes?: string | null;
	result?: string | null;
	orderIds?: string[] | null;
	deliveryIds?: string[] | null;
};

type ListCommercialVisitsByCommercialInput = {
	commercialId: string;
	clientId?: string | null;
	statusId?: number | null;
	visitTypeId?: number | null;
	dateFrom?: string | null;
	dateTo?: string | null;
};

// --------------------------------------------------------------------------
// SERVICIOS
// --------------------------------------------------------------------------

export class CreateCommercialVisitError extends Error {
	status: number;
	code: string;

	constructor(
		message: string,
		status = 400,
		code = "CREATE_COMMERCIAL_VISIT_ERROR",
	) {
		super(message);
		this.name = "CreateCommercialVisitError";
		this.status = status;
		this.code = code;
	}
}

export class UpdateCommercialVisitError extends Error {
	status: number;
	code: string;

	constructor(
		message: string,
		status = 400,
		code = "UPDATE_COMMERCIAL_VISIT_ERROR",
	) {
		super(message);
		this.name = "UpdateCommercialVisitError";
		this.status = status;
		this.code = code;
	}
}

export async function autoPostponeExpiredPlannedVisitsByCommercial(
	commercialId: string,
) {
	const ds = await getDataSource();
	const repo = ds.getRepository(CommercialVisit);
	const madridClock = getMadridClock();

	const candidateVisits = await buildCommercialVisitQuery(repo)
		.where("visit.commercial_id = :commercialId", { commercialId })
		.andWhere("visit.status_id = :plannedStatusId", {
			plannedStatusId: COMMERCIAL_VISIT_STATUS_IDS.PLANNED,
		})
		.andWhere("visit.scheduled_for_date <= :todayDate", {
			todayDate: madridClock.date,
		})
		.getMany();

	const expiredVisitIds = candidateVisits
		.filter((visit) => {
			if (visit.scheduled_for_date < madridClock.date) {
				return true;
			}

			const endMinutes = parseTimeToMinutes(
				visit.client?.visit_window_end_time ?? null,
			);

			if (endMinutes === null) {
				return false;
			}

			return madridClock.totalMinutes > endMinutes;
		})
		.map((visit) => visit.id);

	if (expiredVisitIds.length === 0) {
		return 0;
	}

	await ds.transaction(async (manager) => {
		await manager
			.getRepository(CommercialVisit)
			.createQueryBuilder()
			.update(CommercialVisit)
			.set({
				status_id: COMMERCIAL_VISIT_STATUS_IDS.POSTPONED,
			})
			.where("id IN (:...visitIds)", {
				visitIds: expiredVisitIds,
			})
			.execute();

		await notifyCommercialVisitsAutoPostponed(manager, {
			commercialUserId: commercialId,
			visits: candidateVisits.filter((visit) =>
				expiredVisitIds.includes(visit.id),
			),
		});
	});

	return expiredVisitIds.length;
}

// Crear visita comercial validando cliente y comercial.
export async function createCommercialVisit(input: CreateCommercialVisitInput) {
	const ds = await getDataSource();

	const visitId = await ds.transaction(async (manager) => {
		const visitRepo = manager.getRepository(CommercialVisit);
		const clientRepo = manager.getRepository(Client);
		const commercialRepo = manager.getRepository(Commercial);
		const orderRepo = manager.getRepository(Order);

		if (
			!input.clientId ||
			!input.commercialId ||
			!input.scheduledForDate ||
			!input.visitTypeId
		) {
			throw new CreateCommercialVisitError(
				"Faltan datos obligatorios",
				400,
				"INVALID_DATA",
			);
		}

		const normalizedScheduledForDate = normalizeDateOnly(
			input.scheduledForDate,
		);

		if (!normalizedScheduledForDate) {
			throw new CreateCommercialVisitError(
				"La fecha de la visita no es válida",
				400,
				"INVALID_DATE",
			);
		}

		if (!isValidCommercialVisitType(Number(input.visitTypeId))) {
			throw new CreateCommercialVisitError(
				"El tipo de visita indicado no es válido",
				400,
				"INVALID_VISIT_TYPE",
			);
		}

		const client = await clientRepo.findOne({
			where: { id: input.clientId },
		});
		const commercial = await commercialRepo.findOne({
			where: { id: input.commercialId },
		});
		const activeAssignment = await getActiveAssignmentByCommercialAndClient(
			input.commercialId,
			input.clientId,
		);

		if (!client) {
			throw new CreateCommercialVisitError(
				"Cliente no encontrado",
				404,
				"CLIENT_NOT_FOUND",
			);
		}

		if (!commercial) {
			throw new CreateCommercialVisitError(
				"Comercial no encontrado",
				404,
				"COMMERCIAL_NOT_FOUND",
			);
		}

		if (!activeAssignment) {
			throw new CreateCommercialVisitError(
				"El cliente no está asignado actualmente a este comercial",
				409,
				"CLIENT_NOT_ASSIGNED_TO_COMMERCIAL",
			);
		}

		const normalizedInputOrderIds = normalizeOrderIds(input.orderIds);
		const normalizedInputDeliveryIds = normalizeDeliveryIds(input.deliveryIds);

		if (
			Number(input.visitTypeId) !== COMMERCIAL_VISIT_TYPE_IDS.DELIVERY &&
			(normalizedInputOrderIds.length > 0 ||
				normalizedInputDeliveryIds.length > 0)
		) {
			throw new CreateCommercialVisitError(
				"Solo las visitas de reparto pueden crearse con repartos vinculados",
				409,
				"VISIT_ORDERS_REQUIRE_DELIVERY_TYPE",
			);
		}

		if (
			normalizedInputOrderIds.length > 0 &&
			normalizedInputDeliveryIds.length > 0
		) {
			throw new CreateCommercialVisitError(
				"No mezcles pedidos y repartos en la misma visita. Prepara repartos y vincula esos repartos.",
				409,
				"VISIT_DELIVERY_MIXED_LINKS",
			);
		}

		const validatedDeliveryIds =
			Number(input.visitTypeId) === COMMERCIAL_VISIT_TYPE_IDS.DELIVERY
				? await validateOrderDeliveryIdsForVisit(manager, {
						clientId: input.clientId,
						deliveryIds: normalizedInputDeliveryIds,
						errorFactory: (message, status, code) =>
							new CreateCommercialVisitError(message, status, code),
					})
				: [];
		const validatedOrderIds =
			Number(input.visitTypeId) === COMMERCIAL_VISIT_TYPE_IDS.DELIVERY &&
			validatedDeliveryIds.length === 0
				? await validateDeliveryOrderIdsForVisit(manager, {
						clientId: input.clientId,
						orderIds: normalizedInputOrderIds,
						errorFactory: (message, status, code) =>
							new CreateCommercialVisitError(message, status, code),
					})
				: [];

		if (
			Number(input.visitTypeId) === COMMERCIAL_VISIT_TYPE_IDS.DELIVERY &&
			validatedDeliveryIds.length === 0 &&
			validatedOrderIds.length === 0
		) {
			throw new CreateCommercialVisitError(
				"Debes seleccionar al menos un reparto preparado para crear una visita de reparto",
				409,
				"DELIVERY_VISIT_REQUIRES_ORDERS",
			);
		}

		const visit = visitRepo.create({
			client_id: input.clientId,
			commercial_id: input.commercialId,
			scheduled_for_date: normalizedScheduledForDate,
			visit_type_id: Number(input.visitTypeId),
			status_id: COMMERCIAL_VISIT_STATUS_IDS.PLANNED,
			notes: normalizeText(input.notes) || null,
			result: null,
		});

		await visitRepo.save(visit);
		await notifyClientVisitCreated(manager, visit);

		if (validatedDeliveryIds.length > 0) {
			await manager
				.getRepository(OrderDelivery)
				.createQueryBuilder()
				.update(OrderDelivery)
				.set({
					delivery_visit_id: visit.id,
					status: "planned",
				})
				.where("id IN (:...deliveryIds)", {
					deliveryIds: validatedDeliveryIds,
				})
				.execute();
		} else if (validatedOrderIds.length > 0) {
			await orderRepo
				.createQueryBuilder()
				.update(Order)
				.set({
					delivery_visit_id: visit.id,
				})
				.where("id IN (:...orderIds)", {
					orderIds: validatedOrderIds,
				})
				.execute();
		}

		return visit.id;
	});

	const createdVisit = await getCommercialVisitDetailByIdForCommercial(
		visitId,
		input.commercialId,
	);

	if (!createdVisit) {
		throw new CreateCommercialVisitError(
			"No se pudo recuperar la visita recién creada",
			500,
			"VISIT_CREATED_BUT_NOT_RELOADED",
		);
	}

	return createdVisit;
}

// Obtener visita comercial por su ID, incluyendo relaciones principales.
export async function getCommercialVisitById(id: string) {
	const ds = await getDataSource();
	const repo = ds.getRepository(CommercialVisit);

	return buildCommercialVisitQuery(repo)
		.where("visit.id = :id", { id })
		.getOne();
}

// Obtener visita comercial por su ID restringiendo el acceso al comercial propietario.
export async function getCommercialVisitByIdForCommercial(
	visitId: string,
	commercialId: string,
) {
	const ds = await getDataSource();
	const repo = ds.getRepository(CommercialVisit);

	await autoPostponeExpiredPlannedVisitsByCommercial(commercialId);

	return buildCommercialVisitQuery(repo)
		.where("visit.id = :visitId", { visitId })
		.andWhere("visit.commercial_id = :commercialId", { commercialId })
		.getOne();
}

async function listLinkedOrdersForVisit(visitId: string) {
	const ds = await getDataSource();
	const orderRepo = ds.getRepository(Order);
	const orders = await orderRepo
		.createQueryBuilder("order")
		.leftJoinAndSelect("order.status", "status")
		.leftJoinAndSelect("order.lines", "lines")
		.where("order.delivery_visit_id = :visitId", { visitId })
		.orderBy("order.created_at", "DESC")
		.getMany();

	return orders.map(mapOrderToDeliveryOrderSummary);
}

async function listLinkedDeliveriesForVisit(visitId: string) {
	const ds = await getDataSource();
	const deliveryRepo = ds.getRepository(OrderDelivery);
	const linkedDeliveries = await deliveryRepo
		.createQueryBuilder("delivery")
		.leftJoinAndSelect("delivery.order", "order")
		.leftJoinAndSelect("order.client", "client")
		.leftJoinAndSelect("client.user", "clientUser")
		.leftJoinAndSelect("order.status", "orderStatus")
		.leftJoinAndSelect("delivery.commercial", "commercial")
		.leftJoinAndSelect("commercial.user", "commercialUser")
		.leftJoinAndSelect("delivery.deliveryVisit", "deliveryVisit")
		.leftJoinAndSelect("deliveryVisit.status", "deliveryVisitStatus")
		.leftJoinAndSelect("delivery.lines", "deliveryLines")
		.leftJoinAndSelect("deliveryLines.orderLine", "orderLine")
		.leftJoinAndSelect("orderLine.product", "product")
		.leftJoinAndSelect("product.productLine", "productLine")
		.leftJoinAndSelect("orderLine.colorReference", "colorReference")
		.where("delivery.delivery_visit_id = :visitId", { visitId })
		.orderBy("delivery.created_at", "DESC")
		.getMany();

	return linkedDeliveries.map(mapOrderDeliveryToSummary);
}

async function listAvailableOrdersForDeliveryVisit(
	clientId: string,
	visitId: string,
) {
	const ds = await getDataSource();
	const orderRepo = ds.getRepository(Order);
	const orders = await orderRepo
		.createQueryBuilder("order")
		.leftJoinAndSelect("order.status", "status")
		.leftJoinAndSelect("order.lines", "lines")
		.leftJoinAndSelect("order.deliveryVisit", "deliveryVisit")
		.where("order.client_id = :clientId", { clientId })
		.andWhere("order.status_id = :confirmedStatusId", {
			confirmedStatusId: ORDER_STATUS_IDS.CONFIRMED,
		})
		.andWhere(
			[
				"order.delivery_visit_id IS NULL",
				"order.delivery_visit_id = :visitId",
				"deliveryVisit.status_id = :postponedVisitStatusId",
			]
				.map((condition) => `(${condition})`)
				.join(" OR "),
			{
				visitId,
				postponedVisitStatusId: COMMERCIAL_VISIT_STATUS_IDS.POSTPONED,
			},
		)
		.orderBy("order.created_at", "DESC")
		.getMany();

	return orders.map(mapOrderToDeliveryOrderSummary);
}

async function listAvailableDeliveriesForDeliveryVisit(
	clientId: string,
	visitId: string,
) {
	const ds = await getDataSource();
	return listAvailableOrderDeliveriesForVisit(ds.manager, { clientId, visitId });
}

async function listCompletedElsewhereOrdersForVisit(visit: CommercialVisit) {
	if (
		visit.visit_type_id !== COMMERCIAL_VISIT_TYPE_IDS.DELIVERY ||
		visit.status_id !== COMMERCIAL_VISIT_STATUS_IDS.POSTPONED
	) {
		return [] as CommercialVisitDeliveryOrder[];
	}

	const ds = await getDataSource();
	const orderRepo = ds.getRepository(Order);
	const orders = await orderRepo
		.createQueryBuilder("order")
		.leftJoinAndSelect("order.status", "status")
		.leftJoinAndSelect("order.lines", "lines")
		.leftJoinAndSelect("order.deliveryVisit", "deliveryVisit")
		.where("order.client_id = :clientId", { clientId: visit.client_id })
		.andWhere("order.status_id = :deliveredStatusId", {
			deliveredStatusId: ORDER_STATUS_IDS.DELIVERED,
		})
		.andWhere("order.delivery_visit_id IS NOT NULL")
		.andWhere("order.delivery_visit_id != :visitId", { visitId: visit.id })
		.andWhere("deliveryVisit.scheduled_for_date >= :scheduledForDate", {
			scheduledForDate: visit.scheduled_for_date,
		})
		.orderBy("order.updated_at", "DESC")
		.getMany();

	return orders.map(mapOrderToDeliveryOrderSummary);
}

async function listCompletedElsewhereDeliveriesForVisit(visit: CommercialVisit) {
	if (
		visit.visit_type_id !== COMMERCIAL_VISIT_TYPE_IDS.DELIVERY ||
		visit.status_id !== COMMERCIAL_VISIT_STATUS_IDS.POSTPONED
	) {
		return [] as ReturnType<typeof mapOrderDeliveryToSummary>[];
	}

	const ds = await getDataSource();
	const deliveryRepo = ds.getRepository(OrderDelivery);
	const deliveries = await deliveryRepo
		.createQueryBuilder("delivery")
		.leftJoinAndSelect("delivery.order", "order")
		.leftJoinAndSelect("order.client", "client")
		.leftJoinAndSelect("client.user", "clientUser")
		.leftJoinAndSelect("order.status", "orderStatus")
		.leftJoinAndSelect("delivery.commercial", "commercial")
		.leftJoinAndSelect("commercial.user", "commercialUser")
		.leftJoinAndSelect("delivery.deliveryVisit", "deliveryVisit")
		.leftJoinAndSelect("deliveryVisit.status", "deliveryVisitStatus")
		.leftJoinAndSelect("delivery.lines", "deliveryLines")
		.leftJoinAndSelect("deliveryLines.orderLine", "orderLine")
		.leftJoinAndSelect("orderLine.product", "product")
		.leftJoinAndSelect("product.productLine", "productLine")
		.leftJoinAndSelect("orderLine.colorReference", "colorReference")
		.where("order.client_id = :clientId", { clientId: visit.client_id })
		.andWhere("delivery.status = :deliveredStatus", {
			deliveredStatus: "delivered",
		})
		.andWhere("delivery.delivery_visit_id IS NOT NULL")
		.andWhere("delivery.delivery_visit_id != :visitId", { visitId: visit.id })
		.andWhere("deliveryVisit.scheduled_for_date >= :scheduledForDate", {
			scheduledForDate: visit.scheduled_for_date,
		})
		.orderBy("delivery.updated_at", "DESC")
		.getMany();

	return deliveries.map(mapOrderDeliveryToSummary);
}

async function buildCommercialVisitDetail(
	visit: CommercialVisit,
): Promise<CommercialVisitDetail> {
	const [
		linkedOrders,
		availableOrdersForDelivery,
		completedElsewhereOrders,
		linkedDeliveries,
		availableDeliveriesForDelivery,
		completedElsewhereDeliveries,
	] = await Promise.all([
		listLinkedOrdersForVisit(visit.id),
		listAvailableOrdersForDeliveryVisit(visit.client_id, visit.id),
		listCompletedElsewhereOrdersForVisit(visit),
		listLinkedDeliveriesForVisit(visit.id),
		listAvailableDeliveriesForDeliveryVisit(visit.client_id, visit.id),
		listCompletedElsewhereDeliveriesForVisit(visit),
	]);
	const visitData = visit as unknown as CommercialVisitDetail;

	return {
		...visitData,
		linkedOrders,
		availableOrdersForDelivery,
		completedElsewhereOrders,
		linkedDeliveries,
		availableDeliveriesForDelivery,
		completedElsewhereDeliveries,
	};
}

export async function getCommercialVisitDetailById(visitId: string) {
	const visit = await getCommercialVisitById(visitId);
	return visit ? buildCommercialVisitDetail(visit) : null;
}

export async function getCommercialVisitDetailByIdForCommercial(
	visitId: string,
	commercialId: string,
) {
	const visit = await getCommercialVisitByIdForCommercial(visitId, commercialId);
	return visit ? buildCommercialVisitDetail(visit) : null;
}

// Listar visitas de un cliente, ordenadas por fecha descendente.
export async function listCommercialVisitsByClient(clientId: string) {
	const ds = await getDataSource();
	const repo = ds.getRepository(CommercialVisit);

	return buildCommercialVisitQuery(repo)
		.where("visit.client_id = :clientId", { clientId })
		.orderBy("visit.scheduled_for_date", "DESC")
		.getMany();
}

// Listar visitas de un comercial, con filtros opcionales por cliente, estado, tipo y rango de fechas.
export async function listCommercialVisitsByCommercial(
	input: ListCommercialVisitsByCommercialInput,
) {
	const ds = await getDataSource();
	const repo = ds.getRepository(CommercialVisit);

	await autoPostponeExpiredPlannedVisitsByCommercial(input.commercialId);

	const query = buildCommercialVisitQuery(repo)
		.where("visit.commercial_id = :commercialId", {
			commercialId: input.commercialId,
		})
		.orderBy("visit.scheduled_for_date", "DESC");

	if (input.clientId) {
		query.andWhere("visit.client_id = :clientId", {
			clientId: input.clientId,
		});
	}

	if (input.statusId) {
		query.andWhere("visit.status_id = :statusId", {
			statusId: input.statusId,
		});
	}

	if (input.visitTypeId) {
		query.andWhere("visit.visit_type_id = :visitTypeId", {
			visitTypeId: input.visitTypeId,
		});
	}

	if (input.dateFrom) {
		query.andWhere("visit.scheduled_for_date >= :dateFrom", {
			dateFrom: input.dateFrom,
		});
	}

	if (input.dateTo) {
		query.andWhere("visit.scheduled_for_date <= :dateTo", {
			dateTo: input.dateTo,
		});
	}

	return query.getMany();
}

// Actualizar una visita comercial ya existente.
export async function updateCommercialVisit(input: UpdateCommercialVisitInput) {
	const ds = await getDataSource();

	await autoPostponeExpiredPlannedVisitsByCommercial(input.commercialId);

	const visitId = await ds.transaction(async (manager) => {
		const repo = manager.getRepository(CommercialVisit);
		const orderRepo = manager.getRepository(Order);
		const deliveryRepo = manager.getRepository(OrderDelivery);

		const visit = await repo.findOne({
			where: {
				id: input.visitId,
				commercial_id: input.commercialId,
			},
		});
		const currentLinkedOrders = await orderRepo
			.createQueryBuilder("order")
			.where("order.delivery_visit_id = :visitId", {
				visitId: input.visitId,
			})
			.getMany();
		const currentLinkedDeliveries = await deliveryRepo
			.createQueryBuilder("delivery")
			.leftJoinAndSelect("delivery.order", "order")
			.where("delivery.delivery_visit_id = :visitId", {
				visitId: input.visitId,
			})
			.getMany();

		if (!visit) {
			throw new UpdateCommercialVisitError(
				"Visita no encontrada",
				404,
				"VISIT_NOT_FOUND",
			);
		}

		if (visit.status_id === COMMERCIAL_VISIT_STATUS_IDS.POSTPONED) {
			throw new UpdateCommercialVisitError(
				"Esta visita esta aplazada y no se puede modificar. Crea una nueva visita para continuar.",
				409,
				"VISIT_POSTPONED_READ_ONLY",
			);
		}

		if (input.scannedDeliveryQr !== undefined) {
			const scannedDeliveryId = extractOrderDeliveryIdFromQrValue(
				input.scannedDeliveryQr,
			);

			if (!scannedDeliveryId) {
				throw new UpdateCommercialVisitError(
					"El QR escaneado no tiene un formato reconocido para repartos",
					400,
					"DELIVERY_VISIT_QR_INVALID",
				);
			}

			if (visit.visit_type_id !== COMMERCIAL_VISIT_TYPE_IDS.DELIVERY) {
				throw new UpdateCommercialVisitError(
					"Solo las visitas de reparto permiten escanear repartos",
					409,
					"VISIT_QR_REQUIRES_DELIVERY_TYPE",
				);
			}

			if (visit.status_id !== COMMERCIAL_VISIT_STATUS_IDS.PLANNED) {
				throw new UpdateCommercialVisitError(
					"Solo se pueden escanear repartos en una visita planificada",
					409,
					"VISIT_QR_NOT_EDITABLE",
				);
			}

			const linkedDelivery = await deliveryRepo
				.createQueryBuilder("delivery")
				.leftJoinAndSelect("delivery.order", "order")
				.where("delivery.id = :deliveryId", { deliveryId: scannedDeliveryId })
				.andWhere("delivery.delivery_visit_id = :visitId", {
					visitId: visit.id,
				})
				.getOne();

			if (!linkedDelivery) {
				throw new UpdateCommercialVisitError(
					"El QR escaneado no pertenece a ningun reparto vinculado a esta visita",
					409,
					"DELIVERY_VISIT_QR_DELIVERY_MISMATCH",
				);
			}

			if (linkedDelivery.status === "delivered") {
				throw new UpdateCommercialVisitError(
					"Este reparto ya estaba completado",
					409,
					"DELIVERY_ALREADY_COMPLETED",
				);
			}

			if (linkedDelivery.status !== "planned") {
				throw new UpdateCommercialVisitError(
					"Este reparto no esta pendiente de entrega",
					409,
					"DELIVERY_NOT_DELIVERABLE",
				);
			}

			await deliveryRepo.update(
				{ id: linkedDelivery.id },
				{
					status: "delivered",
					delivered_at: new Date(),
					delivered_by_user_id:
						String(input.actedByUserId ?? "").trim() || null,
				},
			);
			await syncOrderDeliveredStatusFromDeliveries(
				manager,
				linkedDelivery.order_id,
			);

			const remainingPlannedDeliveries = await deliveryRepo
				.createQueryBuilder("delivery")
				.where("delivery.delivery_visit_id = :visitId", { visitId: visit.id })
				.andWhere("delivery.status IN (:...pendingStatuses)", {
					pendingStatuses: ["prepared", "planned"],
				})
				.getCount();

			if (remainingPlannedDeliveries === 0) {
				visit.status_id = COMMERCIAL_VISIT_STATUS_IDS.COMPLETED;
				visit.result =
					normalizeText(input.result) ||
					visit.result ||
					"Entrega confirmada mediante QR.";
				await repo.save(visit);
			}

			return visit.id;
		}

		if (input.scannedOrderQr !== undefined) {
			const scannedOrderId = extractOrderIdFromQrValue(input.scannedOrderQr);

			if (!scannedOrderId) {
				throw new UpdateCommercialVisitError(
					"El QR escaneado no tiene un formato reconocido para pedidos",
					400,
					"DELIVERY_VISIT_QR_INVALID",
				);
			}

			if (visit.visit_type_id !== COMMERCIAL_VISIT_TYPE_IDS.DELIVERY) {
				throw new UpdateCommercialVisitError(
					"Solo las visitas de reparto permiten escanear pedidos",
					409,
					"VISIT_QR_REQUIRES_DELIVERY_TYPE",
				);
			}

			if (visit.status_id !== COMMERCIAL_VISIT_STATUS_IDS.PLANNED) {
				throw new UpdateCommercialVisitError(
					"Solo se pueden escanear pedidos en una visita planificada",
					409,
					"VISIT_QR_NOT_EDITABLE",
				);
			}

			const linkedOrder = await orderRepo
				.createQueryBuilder("order")
				.leftJoinAndSelect("order.status", "status")
				.where("order.id = :orderId", { orderId: scannedOrderId })
				.andWhere("order.delivery_visit_id = :visitId", { visitId: visit.id })
				.getOne();

			if (!linkedOrder) {
				throw new UpdateCommercialVisitError(
					"El QR escaneado no pertenece a ningun pedido vinculado a esta visita",
					409,
					"DELIVERY_VISIT_QR_ORDER_MISMATCH",
				);
			}

			if (linkedOrder.status_id === ORDER_STATUS_IDS.DELIVERED) {
				throw new UpdateCommercialVisitError(
					"Este pedido ya estaba completado",
					409,
					"DELIVERY_ORDER_ALREADY_COMPLETED",
				);
			}

			if (linkedOrder.status_id !== ORDER_STATUS_IDS.CONFIRMED) {
				throw new UpdateCommercialVisitError(
					"Este pedido no esta pendiente de entrega",
					409,
					"DELIVERY_ORDER_NOT_CONFIRMABLE",
				);
			}

			await orderRepo.update(
				{ id: linkedOrder.id },
				{ status_id: ORDER_STATUS_IDS.DELIVERED },
			);

			const remainingConfirmedOrders = await orderRepo.count({
				where: {
					delivery_visit_id: visit.id,
					status_id: ORDER_STATUS_IDS.CONFIRMED,
				},
			});

			if (remainingConfirmedOrders === 0) {
				visit.status_id = COMMERCIAL_VISIT_STATUS_IDS.COMPLETED;
				visit.result =
					normalizeText(input.result) ||
					visit.result ||
					"Entrega confirmada mediante QR.";
				await repo.save(visit);
			}

			return visit.id;
		}

		const previousStatusId = visit.status_id;
		const previousScheduledForDate = visit.scheduled_for_date;

		if (input.scheduledForDate !== undefined) {
			const normalizedScheduledForDate = normalizeDateOnlyForUpdate(
				input.scheduledForDate,
			);

			if (!normalizedScheduledForDate) {
				throw new UpdateCommercialVisitError(
					"La fecha de la visita no es válida",
					400,
					"INVALID_DATE",
				);
			}

			if (!canEditCommercialVisitPlanning(visit.status_id)) {
				throw new UpdateCommercialVisitError(
					"Solo se puede reprogramar una visita planificada",
					409,
					"VISIT_NOT_EDITABLE",
				);
			}

			visit.scheduled_for_date = normalizedScheduledForDate;
		}

		if (input.visitTypeId !== undefined) {
			if (!isValidCommercialVisitType(Number(input.visitTypeId))) {
				throw new UpdateCommercialVisitError(
					"El tipo de visita indicado no es válido",
					400,
					"INVALID_VISIT_TYPE",
				);
			}

			if (!canEditCommercialVisitPlanning(visit.status_id)) {
				throw new UpdateCommercialVisitError(
					"Solo se puede cambiar el tipo de una visita planificada",
					409,
					"VISIT_TYPE_NOT_EDITABLE",
				);
			}

			visit.visit_type_id = Number(input.visitTypeId);
		}

		const nextVisitTypeId = visit.visit_type_id;

		let nextStatusId =
			input.statusId !== undefined ? Number(input.statusId) : visit.status_id;

		if (
			input.scheduledForDate !== undefined &&
			visit.status_id === COMMERCIAL_VISIT_STATUS_IDS.POSTPONED &&
			input.statusId === undefined
		) {
			nextStatusId = COMMERCIAL_VISIT_STATUS_IDS.PLANNED;
		}

		const nextResult =
			input.result !== undefined
				? normalizeText(input.result) || null
				: visit.result;
		const currentLinkedOrderIds = currentLinkedOrders.map((order) => order.id);
		const currentLinkedDeliveryIds = currentLinkedDeliveries.map(
			(delivery) => delivery.id,
		);
		let finalAssignedOrderIds = currentLinkedOrderIds;
		let finalAssignedDeliveryIds = currentLinkedDeliveryIds;

		if (input.statusId !== undefined) {
			if (!isValidCommercialVisitStatus(nextStatusId)) {
				throw new UpdateCommercialVisitError(
					"El estado indicado no es válido",
					400,
					"INVALID_STATUS",
				);
			}

			if (!canTransitionCommercialVisitStatus(visit.status_id, nextStatusId)) {
				throw new UpdateCommercialVisitError(
					"No se permite ese cambio de estado para la visita",
					409,
					"INVALID_STATUS_TRANSITION",
				);
			}
		}

		if (input.orderIds !== undefined) {
			if (!canEditCommercialVisitPlanning(visit.status_id)) {
				throw new UpdateCommercialVisitError(
					"Solo se pueden ajustar pedidos en una visita planificada",
					409,
					"VISIT_ORDERS_NOT_EDITABLE",
				);
			}

			finalAssignedOrderIds = await validateDeliveryOrderIdsForVisit(manager, {
				clientId: visit.client_id,
				visitId: visit.id,
				orderIds: input.orderIds,
			});
		}

		if (input.deliveryIds !== undefined) {
			if (!canEditCommercialVisitPlanning(visit.status_id)) {
				throw new UpdateCommercialVisitError(
					"Solo se pueden ajustar repartos en una visita planificada",
					409,
					"VISIT_DELIVERIES_NOT_EDITABLE",
				);
			}

			finalAssignedDeliveryIds = await validateOrderDeliveryIdsForVisit(manager, {
				clientId: visit.client_id,
				visitId: visit.id,
				deliveryIds: input.deliveryIds,
			});
		}

		if (
			nextVisitTypeId !== COMMERCIAL_VISIT_TYPE_IDS.DELIVERY &&
			(finalAssignedOrderIds.length > 0 || finalAssignedDeliveryIds.length > 0)
		) {
			throw new UpdateCommercialVisitError(
				"Solo las visitas de reparto pueden tener repartos vinculados",
				409,
				"VISIT_ORDERS_REQUIRE_DELIVERY_TYPE",
			);
		}

		if (
			nextVisitTypeId === COMMERCIAL_VISIT_TYPE_IDS.DELIVERY &&
			nextStatusId !== COMMERCIAL_VISIT_STATUS_IDS.CANCELLED &&
			finalAssignedOrderIds.length === 0 &&
			finalAssignedDeliveryIds.length === 0
		) {
			throw new UpdateCommercialVisitError(
				"Una visita de reparto debe mantener al menos un reparto preparado vinculado mientras siga activa",
				409,
				"DELIVERY_VISIT_REQUIRES_ORDERS",
			);
		}

		if (nextStatusId === COMMERCIAL_VISIT_STATUS_IDS.COMPLETED && !nextResult) {
			throw new UpdateCommercialVisitError(
				"Para completar una visita debes indicar un resultado",
				400,
				"RESULT_REQUIRED_FOR_COMPLETION",
			);
		}

		if (
			nextStatusId === COMMERCIAL_VISIT_STATUS_IDS.COMPLETED &&
			nextVisitTypeId === COMMERCIAL_VISIT_TYPE_IDS.DELIVERY &&
			finalAssignedOrderIds.length === 0 &&
			finalAssignedDeliveryIds.length === 0
		) {
			throw new UpdateCommercialVisitError(
				"Debes vincular al menos un reparto preparado antes de completar una visita de reparto",
				409,
				"DELIVERY_VISIT_REQUIRES_ORDERS",
			);
		}

		if (
			visit.status_id !== COMMERCIAL_VISIT_STATUS_IDS.COMPLETED &&
			nextStatusId === COMMERCIAL_VISIT_STATUS_IDS.COMPLETED &&
			nextVisitTypeId === COMMERCIAL_VISIT_TYPE_IDS.DELIVERY
		) {
			if (finalAssignedDeliveryIds.length > 0) {
				validateDeliveredDeliveryQrs(
					finalAssignedDeliveryIds,
					input.deliveredDeliveryQrs,
				);
			} else {
				validateDeliveredOrderQrs(
					finalAssignedOrderIds,
					input.deliveredOrderQrs,
				);
			}
		}

		if (input.notes !== undefined) {
			visit.notes = normalizeText(input.notes) || null;
		}

		if (input.orderIds !== undefined) {
			const orderIdsToUnassign = currentLinkedOrderIds.filter(
				(orderId) => !finalAssignedOrderIds.includes(orderId),
			);
			const orderIdsToAssign = finalAssignedOrderIds.filter(
				(orderId) => !currentLinkedOrderIds.includes(orderId),
			);

			if (orderIdsToUnassign.length > 0) {
				await orderRepo
					.createQueryBuilder()
					.update(Order)
					.set({
						delivery_visit_id: null,
					})
					.where("id IN (:...orderIds)", {
						orderIds: orderIdsToUnassign,
					})
					.execute();
			}

			if (orderIdsToAssign.length > 0) {
				await orderRepo
					.createQueryBuilder()
					.update(Order)
					.set({
						delivery_visit_id: visit.id,
					})
					.where("id IN (:...orderIds)", {
						orderIds: orderIdsToAssign,
					})
				.execute();
			}
		}

		if (input.deliveryIds !== undefined) {
			const deliveryIdsToUnassign = currentLinkedDeliveryIds.filter(
				(deliveryId) => !finalAssignedDeliveryIds.includes(deliveryId),
			);
			const deliveryIdsToAssign = finalAssignedDeliveryIds.filter(
				(deliveryId) => !currentLinkedDeliveryIds.includes(deliveryId),
			);

			if (deliveryIdsToUnassign.length > 0) {
				await deliveryRepo
					.createQueryBuilder()
					.update(OrderDelivery)
					.set({
						delivery_visit_id: null,
						status: "prepared",
					})
					.where("id IN (:...deliveryIds)", {
						deliveryIds: deliveryIdsToUnassign,
					})
					.andWhere("status = :plannedStatus", {
						plannedStatus: "planned",
					})
					.execute();
			}

			if (deliveryIdsToAssign.length > 0) {
				await deliveryRepo
					.createQueryBuilder()
					.update(OrderDelivery)
					.set({
						delivery_visit_id: visit.id,
						status: "planned",
					})
					.where("id IN (:...deliveryIds)", {
						deliveryIds: deliveryIdsToAssign,
					})
					.execute();
			}
		}

		visit.status_id = nextStatusId;
		visit.result = nextResult;

		await repo.save(visit);

		if (
			previousStatusId === COMMERCIAL_VISIT_STATUS_IDS.POSTPONED &&
			nextStatusId === COMMERCIAL_VISIT_STATUS_IDS.PLANNED &&
			previousScheduledForDate !== visit.scheduled_for_date
		) {
			await notifyClientVisitRescheduled(manager, visit);
		}

		if (
			nextVisitTypeId === COMMERCIAL_VISIT_TYPE_IDS.DELIVERY &&
			nextStatusId === COMMERCIAL_VISIT_STATUS_IDS.CANCELLED
		) {
			await deliveryRepo
				.createQueryBuilder()
				.update(OrderDelivery)
				.set({
					delivery_visit_id: null,
					status: "prepared",
				})
				.where("delivery_visit_id = :visitId", {
					visitId: visit.id,
				})
				.andWhere("status = :plannedStatus", {
					plannedStatus: "planned",
				})
				.execute();

			await orderRepo
				.createQueryBuilder()
				.update(Order)
				.set({
					delivery_visit_id: null,
				})
				.where("delivery_visit_id = :visitId", {
					visitId: visit.id,
				})
				.andWhere("status_id = :confirmedStatusId", {
					confirmedStatusId: ORDER_STATUS_IDS.CONFIRMED,
				})
				.execute();
		}

		if (
			nextVisitTypeId === COMMERCIAL_VISIT_TYPE_IDS.DELIVERY &&
			nextStatusId === COMMERCIAL_VISIT_STATUS_IDS.COMPLETED
		) {
			if (finalAssignedDeliveryIds.length > 0) {
				await deliveryRepo
					.createQueryBuilder()
					.update(OrderDelivery)
					.set({
						status: "delivered",
						delivered_at: new Date(),
						delivered_by_user_id:
							String(input.actedByUserId ?? "").trim() || null,
					})
					.where("id IN (:...deliveryIds)", {
						deliveryIds: finalAssignedDeliveryIds,
					})
					.andWhere("status = :plannedStatus", {
						plannedStatus: "planned",
					})
					.execute();

				const completedDeliveries = await deliveryRepo
					.createQueryBuilder("delivery")
					.where("delivery.id IN (:...deliveryIds)", {
						deliveryIds: finalAssignedDeliveryIds,
					})
					.getMany();
				const orderIdsToSync = Array.from(
					new Set(completedDeliveries.map((delivery) => delivery.order_id)),
				);

				for (const orderId of orderIdsToSync) {
					await syncOrderDeliveredStatusFromDeliveries(manager, orderId);
				}

				return visit.id;
			}

			await orderRepo
				.createQueryBuilder()
				.update(Order)
				.set({
					status_id: ORDER_STATUS_IDS.DELIVERED,
				})
				.where("delivery_visit_id = :visitId", {
					visitId: visit.id,
				})
				.andWhere("status_id = :confirmedStatusId", {
					confirmedStatusId: ORDER_STATUS_IDS.CONFIRMED,
				})
				.execute();
		}

		return visit.id;
	});

	return getCommercialVisitDetailByIdForCommercial(visitId, input.commercialId);
}
