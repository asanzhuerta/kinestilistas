import { Repository } from "typeorm";
import type { EntityManager } from "typeorm";
import type {
	OrderDeliveryLineSummary,
	OrderDeliveryStatusCode,
	OrderDeliverySummary,
	OrderFulfillmentMethod,
	PendingOrderDeliveryLine,
	PendingOrderDeliveryPreparation,
	PrepareOrderDeliveryLineBody,
} from "@/lib/contracts/order";
import { getDataSource } from "@/lib/typeorm/data-source";
import { ClientCommercialAssignment } from "@/lib/typeorm/entities/ClientCommercialAssignment";
import { Order } from "@/lib/typeorm/entities/Order";
import { OrderDelivery } from "@/lib/typeorm/entities/OrderDelivery";
import { OrderDeliveryLine } from "@/lib/typeorm/entities/OrderDeliveryLine";
import { OrderLine } from "@/lib/typeorm/entities/OrderLine";
import {
	COMMERCIAL_VISIT_STATUS_IDS,
	ORDER_STATUS_IDS,
} from "@/lib/typeorm/constants/catalog-ids";
import { requireCommercialByUserId } from "@/lib/typeorm/services/commercial/commercial";
import { canCommercialAccessClient } from "@/lib/typeorm/services/commercial/client-commercial-assignment";
import { normalizeText } from "@/lib/utils/text";

const DELIVERY_STATUS_LABELS: Record<OrderDeliveryStatusCode, string> = {
	prepared: "Preparado",
	planned: "Planificado",
	delivered: "Entregado",
	cancelled: "Cancelado",
};

type PrepareOrderDeliveryInput = {
	orderId?: string | null;
	packageCount?: number | string | null;
	notes?: string | null;
	lines?: PrepareOrderDeliveryLineBody[];
};

function toIsoString(value: Date | string | null | undefined) {
	if (!value) {
		return "";
	}

	return value instanceof Date ? value.toISOString() : String(value);
}

function parseMoneyToCents(value: string | number | null | undefined) {
	const amount = Number(value ?? 0);

	if (!Number.isFinite(amount)) {
		return 0;
	}

	return Math.round(amount * 100);
}

function formatCents(value: number) {
	return (Math.max(0, value) / 100).toFixed(2);
}

function normalizeUuid(value: string | null | undefined, label: string) {
	const normalized = String(value ?? "").trim();

	if (!normalized) {
		throw new OrderDeliveryServiceError(`${label} es obligatorio`, 400, "DELIVERY_FIELD_REQUIRED");
	}

	return normalized;
}

function normalizePositiveInteger(
	value: number | string | null | undefined,
	label: string,
) {
	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new OrderDeliveryServiceError(
			`${label} debe ser un numero entero mayor que cero`,
			400,
			"DELIVERY_POSITIVE_INTEGER_REQUIRED",
		);
	}

	return parsed;
}

function normalizeDeliveryLines(lines: PrepareOrderDeliveryLineBody[] | null | undefined) {
	const merged = new Map<string, number>();

	for (const line of Array.isArray(lines) ? lines : []) {
		const orderLineId = String(line.orderLineId ?? "").trim();

		if (!orderLineId) {
			continue;
		}

		const quantity = normalizePositiveInteger(line.quantity, "La cantidad");
		merged.set(orderLineId, (merged.get(orderLineId) ?? 0) + quantity);
	}

	if (merged.size === 0) {
		throw new OrderDeliveryServiceError(
			"Debes seleccionar al menos una referencia para preparar el reparto",
			400,
			"DELIVERY_LINES_REQUIRED",
		);
	}

	return Array.from(merged.entries()).map(([orderLineId, quantity]) => ({
		orderLineId,
		quantity,
	}));
}

function createOrderDeliveryBaseQuery(repo: Repository<OrderDelivery>) {
	return repo
		.createQueryBuilder("delivery")
		.leftJoinAndSelect("delivery.order", "order")
		.leftJoinAndSelect("order.client", "client")
		.leftJoinAndSelect("client.user", "clientUser")
		.leftJoinAndSelect("order.status", "orderStatus")
		.leftJoinAndSelect("order.paymentStatus", "paymentStatus")
		.leftJoinAndSelect("order.createdByUser", "createdByUser")
		.leftJoinAndSelect("order.payments", "payments")
		.leftJoinAndSelect("payments.registeredByUser", "paymentRegisteredByUser")
		.leftJoinAndSelect("delivery.commercial", "commercial")
		.leftJoinAndSelect("commercial.user", "commercialUser")
		.leftJoinAndSelect("delivery.deliveryVisit", "deliveryVisit")
		.leftJoinAndSelect("deliveryVisit.status", "deliveryVisitStatus")
		.leftJoinAndSelect("delivery.lines", "deliveryLines")
		.leftJoinAndSelect("deliveryLines.orderLine", "orderLine")
		.leftJoinAndSelect("orderLine.product", "product")
		.leftJoinAndSelect("product.productLine", "productLine")
		.leftJoinAndSelect("orderLine.colorReference", "colorReference");
}

function mapDeliveryLineToSummary(line: OrderDeliveryLine): OrderDeliveryLineSummary {
	const orderLine = line.orderLine;

	return {
		id: line.id,
		delivery_id: line.delivery_id,
		order_line_id: line.order_line_id,
		quantity: Number(line.quantity ?? 0),
		product_name: orderLine?.product?.name ?? "Producto",
		product_reference: orderLine?.product?.reference ?? null,
		order_reference: orderLine?.order_reference_snapshot ?? "",
		color_reference_code:
			orderLine?.colorReference?.code ?? orderLine?.variant_code_snapshot ?? null,
		color_reference_name:
			orderLine?.colorReference?.name ?? orderLine?.variant_name_snapshot ?? null,
		product_line_name: orderLine?.product?.productLine?.name ?? null,
	};
}

export function mapOrderDeliveryToSummary(
	delivery: OrderDelivery,
): OrderDeliverySummary {
	const sortedLines = [...(delivery.lines ?? [])].sort((left, right) =>
		String(left.orderLine?.order_reference_snapshot ?? "").localeCompare(
			String(right.orderLine?.order_reference_snapshot ?? ""),
			"es",
			{ sensitivity: "base" },
		),
	);
	const status = String(delivery.status ?? "prepared") as OrderDeliveryStatusCode;

	return {
		id: delivery.id,
		order_id: delivery.order_id,
		order_short_id: delivery.order_id.slice(0, 8),
		fulfillment_method:
			delivery.fulfillment_method ?? delivery.order?.fulfillment_method ?? "commercial",
		client_id: delivery.order?.client_id ?? "",
		client_name: delivery.order?.client?.name ?? "Cliente",
		client_contact_name: delivery.order?.client?.contact_name ?? null,
		client_email: delivery.order?.client?.user?.email ?? null,
		client_phone: delivery.order?.client?.user?.phone ?? null,
		client_address: delivery.order?.client?.address ?? null,
		client_city: delivery.order?.client?.city ?? null,
		client_postal_code: delivery.order?.client?.postal_code ?? null,
		client_province: delivery.order?.client?.province ?? null,
		commercial_id: delivery.commercial_id,
		commercial_name: delivery.commercial?.user?.name ?? null,
		commercial_email: delivery.commercial?.user?.email ?? null,
		commercial_phone: delivery.commercial?.user?.phone ?? null,
		commercial_address: delivery.commercial?.route_start_address ?? null,
		commercial_territory: delivery.commercial?.territory ?? null,
		delivery_visit_id: delivery.delivery_visit_id ?? null,
		delivery_visit_scheduled_for_date:
			delivery.deliveryVisit?.scheduled_for_date ?? null,
		delivery_visit_status_id: delivery.deliveryVisit?.status_id ?? null,
		delivery_visit_status_name: delivery.deliveryVisit?.status?.name ?? null,
		status,
		status_name: DELIVERY_STATUS_LABELS[status] ?? status,
		package_count: Number(delivery.package_count ?? 0),
		notes: delivery.notes ?? null,
		delivered_at: toIsoString(delivery.delivered_at) || null,
		created_at: toIsoString(delivery.created_at),
		updated_at: toIsoString(delivery.updated_at),
		line_count: sortedLines.reduce(
			(total, line) => total + Number(line.quantity ?? 0),
			0,
		),
		lines: sortedLines.map(mapDeliveryLineToSummary),
	};
}

async function loadPreparedQuantityMaps(
	manager: EntityManager,
	orderLineIds: string[],
) {
	if (orderLineIds.length === 0) {
		return {
			preparedByLineId: new Map<string, number>(),
			deliveredByLineId: new Map<string, number>(),
		};
	}

	const rows = await manager
		.getRepository(OrderDeliveryLine)
		.createQueryBuilder("deliveryLine")
		.innerJoin(OrderDelivery, "delivery", "delivery.id = deliveryLine.delivery_id")
		.select("deliveryLine.order_line_id", "order_line_id")
		.addSelect("delivery.status", "status")
		.addSelect("COALESCE(SUM(deliveryLine.quantity), 0)", "quantity")
		.where("deliveryLine.order_line_id IN (:...orderLineIds)", { orderLineIds })
		.andWhere("delivery.status != :cancelledStatus", {
			cancelledStatus: "cancelled",
		})
		.groupBy("deliveryLine.order_line_id")
		.addGroupBy("delivery.status")
		.getRawMany<{
			order_line_id: string;
			status: OrderDeliveryStatusCode;
			quantity: string;
		}>();
	const preparedByLineId = new Map<string, number>();
	const deliveredByLineId = new Map<string, number>();

	for (const row of rows) {
		const quantity = Number(row.quantity ?? 0);
		preparedByLineId.set(
			row.order_line_id,
			(preparedByLineId.get(row.order_line_id) ?? 0) + quantity,
		);

		if (row.status === "delivered") {
			deliveredByLineId.set(
				row.order_line_id,
				(deliveredByLineId.get(row.order_line_id) ?? 0) + quantity,
			);
		}
	}

	return {
		preparedByLineId,
		deliveredByLineId,
	};
}

function mapOrderLineToPendingLine(
	line: OrderLine,
	input: {
		preparedByLineId: Map<string, number>;
		deliveredByLineId: Map<string, number>;
	},
): PendingOrderDeliveryLine {
	const quantity = Number(line.quantity ?? 0);
	const preparedQuantity = input.preparedByLineId.get(line.id) ?? 0;
	const deliveredQuantity = input.deliveredByLineId.get(line.id) ?? 0;

	return {
		id: line.id,
		product_id: line.product_id,
		color_reference_id: line.color_reference_id ?? null,
		product_name: line.product?.name ?? "Producto",
		product_reference: line.product?.reference ?? null,
		order_reference: line.order_reference_snapshot,
		color_reference_code:
			line.colorReference?.code ?? line.variant_code_snapshot ?? null,
		color_reference_name:
			line.colorReference?.name ?? line.variant_name_snapshot ?? null,
		product_line_name: line.product?.productLine?.name ?? null,
		quantity,
		unit_price_snapshot: String(line.unit_price_snapshot ?? "0.00"),
		discount_percentage: String(line.discount_percentage ?? "0.00"),
		line_total: String(line.line_total ?? "0.00"),
		prepared_quantity: preparedQuantity,
		delivered_quantity: deliveredQuantity,
		remaining_quantity: Math.max(0, quantity - preparedQuantity),
	};
}

function mapOrderToPendingPreparation(
	order: Order,
	input: {
		preparedByLineId: Map<string, number>;
		deliveredByLineId: Map<string, number>;
	},
): PendingOrderDeliveryPreparation {
	const sortedLines = [...(order.lines ?? [])].sort((left, right) =>
		String(left.order_reference_snapshot ?? "").localeCompare(
			String(right.order_reference_snapshot ?? ""),
			"es",
			{ sensitivity: "base" },
		),
	);
	const lines = sortedLines.map((line) => mapOrderLineToPendingLine(line, input));
	const payments = [...(order.payments ?? [])];
	const paidCents = payments.reduce(
		(total, payment) => total + parseMoneyToCents(payment.amount),
		0,
	);
	const totalCents = parseMoneyToCents(order.total_amount);
	const remainingLineCount = lines.reduce(
		(total, line) => total + line.remaining_quantity,
		0,
	);

	return {
		id: order.id,
		client_id: order.client_id,
		client_name: order.client?.name ?? "Cliente",
		client_contact_name: order.client?.contact_name ?? null,
		fulfillment_method: order.fulfillment_method ?? "commercial",
		agency_delivery_fee: String(order.agency_delivery_fee ?? "0.00"),
		created_by_user_id: order.created_by_user_id,
		created_by_user_name: order.createdByUser?.name ?? "Usuario",
		created_by_user_role_id: order.createdByUser?.role_id ?? null,
		status_id: order.status_id,
		status_code: order.status?.code ?? "",
		status_name: order.status?.name ?? "Sin estado",
		total_amount: String(order.total_amount ?? "0.00"),
		paid_amount: formatCents(paidCents),
		pending_amount: formatCents(Math.max(0, totalCents - paidCents)),
		notes: order.notes ?? null,
		payment_status_id: order.payment_status_id,
		payment_status_code: order.paymentStatus?.code ?? "",
		payment_status_name: order.paymentStatus?.name ?? "Sin estado de cobro",
		payment_method: order.payment_method ?? null,
		payment_notes: order.payment_notes ?? null,
		paid_at: toIsoString(order.paid_at) || null,
		paid_by_user_id: order.paid_by_user_id ?? null,
		paid_by_user_name: order.paidByUser?.name ?? null,
		created_at: toIsoString(order.created_at),
		updated_at: toIsoString(order.updated_at),
		delivery_visit_id: order.delivery_visit_id ?? null,
		delivery_visit_scheduled_for_date:
			order.deliveryVisit?.scheduled_for_date ?? null,
		delivery_visit_status_id: order.deliveryVisit?.status_id ?? null,
		delivery_visit_status_name: order.deliveryVisit?.status?.name ?? null,
		line_count: sortedLines.reduce(
			(total, line) => total + Number(line.quantity ?? 0),
			0,
		),
		lines,
		payments: [],
		remaining_line_count: remainingLineCount,
	};
}

async function loadConfirmedOrdersForCommercial(
	userId: string,
	input: {
		clientId?: string | null;
	} = {},
) {
	const commercial = await requireCommercialByUserId(userId);
	const ds = await getDataSource();
	const query = ds
		.getRepository(Order)
		.createQueryBuilder("order")
		.innerJoin(
			ClientCommercialAssignment,
			"assignment",
			[
				"assignment.client_id = order.client_id",
				"assignment.commercial_id = :commercialId",
				"assignment.unassigned_at IS NULL",
			].join(" AND "),
			{ commercialId: commercial.id },
		)
		.leftJoinAndSelect("order.client", "client")
		.leftJoinAndSelect("client.user", "clientUser")
		.leftJoinAndSelect("order.createdByUser", "createdByUser")
		.leftJoinAndSelect("order.status", "status")
		.leftJoinAndSelect("order.paymentStatus", "paymentStatus")
		.leftJoinAndSelect("order.paidByUser", "paidByUser")
		.leftJoinAndSelect("order.payments", "payments")
		.leftJoinAndSelect("order.deliveryVisit", "deliveryVisit")
		.leftJoinAndSelect("deliveryVisit.status", "deliveryVisitStatus")
		.leftJoinAndSelect("order.lines", "lines")
		.leftJoinAndSelect("lines.product", "product")
		.leftJoinAndSelect("product.productLine", "productLine")
		.leftJoinAndSelect("lines.colorReference", "colorReference")
		.where("order.status_id = :confirmedStatusId", {
			confirmedStatusId: ORDER_STATUS_IDS.CONFIRMED,
		})
		.orderBy("order.created_at", "DESC")
		.addOrderBy("lines.order_reference_snapshot", "ASC");
	const clientId = String(input.clientId ?? "").trim();

	if (clientId) {
		query.andWhere("order.client_id = :clientId", { clientId });
	}

	return {
		commercial,
		orders: await query.getMany(),
	};
}

export async function listPendingOrderDeliveryPreparationsForCommercialUser(
	userId: string,
	input: {
		clientId?: string | null;
	} = {},
) {
	const ds = await getDataSource();
	const { orders } = await loadConfirmedOrdersForCommercial(userId, input);
	const orderLineIds = orders.flatMap((order) =>
		(order.lines ?? []).map((line) => line.id),
	);
	const quantityMaps = await loadPreparedQuantityMaps(ds.manager, orderLineIds);

	return orders
		.map((order) => mapOrderToPendingPreparation(order, quantityMaps))
		.filter((order) => order.remaining_line_count > 0);
}

export async function listOrderDeliveriesForCommercialUser(
	userId: string,
	input: {
		status?: OrderDeliveryStatusCode | "open" | null;
		clientId?: string | null;
		fulfillmentMethod?: OrderFulfillmentMethod | string | null;
	} = {},
) {
	const commercial = await requireCommercialByUserId(userId);
	const ds = await getDataSource();
	const query = createOrderDeliveryBaseQuery(ds.getRepository(OrderDelivery))
		.innerJoin(
			ClientCommercialAssignment,
			"assignment",
			[
				"assignment.client_id = order.client_id",
				"assignment.commercial_id = :commercialId",
				"assignment.unassigned_at IS NULL",
			].join(" AND "),
			{ commercialId: commercial.id },
		)
		.orderBy("delivery.created_at", "DESC")
		.addOrderBy("deliveryLines.id", "ASC");
	const clientId = String(input.clientId ?? "").trim();

	if (clientId) {
		query.andWhere("order.client_id = :clientId", { clientId });
	}
	const fulfillmentMethod = String(input.fulfillmentMethod ?? "").trim();

	if (fulfillmentMethod === "commercial" || fulfillmentMethod === "agency") {
		query.andWhere("delivery.fulfillment_method = :fulfillmentMethod", {
			fulfillmentMethod,
		});
	}

	if (input.status === "open") {
		query.andWhere("delivery.status IN (:...openStatuses)", {
			openStatuses: ["prepared", "planned"],
		});
	} else if (input.status) {
		query.andWhere("delivery.status = :status", { status: input.status });
	}

	const deliveries = await query.getMany();
	return deliveries.map(mapOrderDeliveryToSummary);
}

export async function getOrderDeliveryById(deliveryId: string) {
	const ds = await getDataSource();
	const delivery = await createOrderDeliveryBaseQuery(ds.getRepository(OrderDelivery))
		.where("delivery.id = :deliveryId", { deliveryId })
		.getOne();

	return delivery ? mapOrderDeliveryToSummary(delivery) : null;
}

export async function getOrderDeliveryForCommercialUser(
	userId: string,
	deliveryId: string,
) {
	const commercial = await requireCommercialByUserId(userId);
	const ds = await getDataSource();
	const delivery = await createOrderDeliveryBaseQuery(ds.getRepository(OrderDelivery))
		.where("delivery.id = :deliveryId", { deliveryId })
		.andWhere("delivery.commercial_id = :commercialId", {
			commercialId: commercial.id,
		})
		.getOne();

	if (!delivery) {
		throw new OrderDeliveryServiceError(
			"El reparto solicitado no existe",
			404,
			"ORDER_DELIVERY_NOT_FOUND",
		);
	}

	return mapOrderDeliveryToSummary(delivery);
}

export async function prepareOrderDeliveryForCommercialUser(
	userId: string,
	input: PrepareOrderDeliveryInput,
) {
	const orderId = normalizeUuid(input.orderId, "El pedido");
	const packageCount = normalizePositiveInteger(input.packageCount, "Los bultos");
	const requestedLines = normalizeDeliveryLines(input.lines);
	const commercial = await requireCommercialByUserId(userId);
	const ds = await getDataSource();

	const deliveryId = await ds.transaction(async (manager) => {
		const orderRepo = manager.getRepository(Order);
		const order = await orderRepo
			.createQueryBuilder("order")
			.where("order.id = :orderId", { orderId })
			.setLock("pessimistic_write")
			.getOne();

		if (!order || order.status_id !== ORDER_STATUS_IDS.CONFIRMED) {
			throw new OrderDeliveryServiceError(
				"Solo se pueden preparar repartos de pedidos confirmados",
				409,
				"ORDER_DELIVERY_REQUIRES_CONFIRMED_ORDER",
			);
		}

		const canAccessClient = await canCommercialAccessClient(
			commercial.id,
			order.client_id,
		);

		if (!canAccessClient) {
			throw new OrderDeliveryServiceError(
				"El cliente de este pedido no esta asignado a este comercial",
				403,
				"ORDER_DELIVERY_CLIENT_NOT_ASSIGNED",
			);
		}

		const orderLines = await manager.getRepository(OrderLine).find({
			where: {
				order_id: order.id,
			},
		});
		const orderLinesById = new Map(
			orderLines.map((line) => [line.id, line]),
		);

		for (const requestedLine of requestedLines) {
			if (!orderLinesById.has(requestedLine.orderLineId)) {
				throw new OrderDeliveryServiceError(
					"Una de las referencias seleccionadas no pertenece al pedido",
					409,
					"ORDER_DELIVERY_LINE_MISMATCH",
				);
			}
		}

		const quantityMaps = await loadPreparedQuantityMaps(
			manager,
			Array.from(orderLinesById.keys()),
		);

		for (const requestedLine of requestedLines) {
			const orderLine = orderLinesById.get(requestedLine.orderLineId);
			const remainingQuantity = Math.max(
				0,
				Number(orderLine?.quantity ?? 0) -
					(quantityMaps.preparedByLineId.get(requestedLine.orderLineId) ?? 0),
			);

			if (requestedLine.quantity > remainingQuantity) {
				throw new OrderDeliveryServiceError(
					"No puedes preparar mas unidades de las que quedan pendientes en el pedido",
					409,
					"ORDER_DELIVERY_QUANTITY_EXCEEDS_REMAINING",
				);
			}
		}

		const deliveryRepo = manager.getRepository(OrderDelivery);
		const savedDelivery = await deliveryRepo.save(
			deliveryRepo.create({
				order_id: order.id,
				commercial_id: commercial.id,
				delivery_visit_id: null,
				status: "prepared",
				fulfillment_method: order.fulfillment_method ?? "commercial",
				package_count: packageCount,
				notes: normalizeText(input.notes) || null,
				created_by_user_id: userId,
			}),
		);

		await manager.getRepository(OrderDeliveryLine).save(
			requestedLines.map((line) =>
				manager.getRepository(OrderDeliveryLine).create({
					delivery_id: savedDelivery.id,
					order_line_id: line.orderLineId,
					quantity: line.quantity,
				}),
			),
		);

		return savedDelivery.id;
	});

	return getOrderDeliveryForCommercialUser(userId, deliveryId);
}

export async function syncOrderDeliveredStatusFromDeliveries(
	manager: EntityManager,
	orderId: string,
) {
	const order = await manager.getRepository(Order).findOne({
		where: { id: orderId },
		relations: {
			lines: true,
		},
	});

	if (!order || order.status_id !== ORDER_STATUS_IDS.CONFIRMED) {
		return;
	}

	const orderLineIds = (order.lines ?? []).map((line) => line.id);
	const { deliveredByLineId } = await loadPreparedQuantityMaps(manager, orderLineIds);
	const allLinesDelivered = (order.lines ?? []).every(
		(line) =>
			(deliveredByLineId.get(line.id) ?? 0) >= Number(line.quantity ?? 0),
	);

	if (allLinesDelivered) {
		await manager
			.getRepository(Order)
			.update({ id: order.id }, { status_id: ORDER_STATUS_IDS.DELIVERED });
	}
}

export async function listAvailableOrderDeliveriesForVisit(
	manager: EntityManager,
	input: {
		clientId: string;
		visitId?: string | null;
	},
) {
	const query = createOrderDeliveryBaseQuery(manager.getRepository(OrderDelivery))
		.where("order.client_id = :clientId", { clientId: input.clientId })
		.andWhere("order.status_id = :confirmedStatusId", {
			confirmedStatusId: ORDER_STATUS_IDS.CONFIRMED,
		})
		.andWhere("delivery.fulfillment_method = :fulfillmentMethod", {
			fulfillmentMethod: "commercial",
		})
		.andWhere(
			[
				"delivery.status = :preparedStatus",
				"(delivery.delivery_visit_id = :visitId AND delivery.status = :plannedStatus)",
				"(deliveryVisit.status_id = :postponedVisitStatusId AND delivery.status = :plannedStatus)",
			]
				.map((condition) => `(${condition})`)
				.join(" OR "),
			{
				visitId: input.visitId ?? "",
				preparedStatus: "prepared",
				plannedStatus: "planned",
				postponedVisitStatusId: COMMERCIAL_VISIT_STATUS_IDS.POSTPONED,
			},
		)
		.orderBy("delivery.created_at", "DESC");

	return (await query.getMany()).map(mapOrderDeliveryToSummary);
}

export async function loadOrderDeliveriesByIdsForVisitValidation(
	manager: EntityManager,
	deliveryIds: string[],
) {
	if (deliveryIds.length === 0) {
		return [] as OrderDelivery[];
	}

	return createOrderDeliveryBaseQuery(manager.getRepository(OrderDelivery))
		.where("delivery.id IN (:...deliveryIds)", { deliveryIds })
		.getMany();
}

export class OrderDeliveryServiceError extends Error {
	status: number;
	code: string;

	constructor(message: string, status = 400, code = "ORDER_DELIVERY_ERROR") {
		super(message);
		this.name = "OrderDeliveryServiceError";
		this.status = status;
		this.code = code;
	}
}
