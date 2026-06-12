import type {
	CreateOrderLineBody,
	OrderFulfillmentMethod,
	OrderDetail,
	OrderPaymentSummary,
	OrderPaymentMethodCode,
	OrderPaymentStatusOption,
	OrderProductOption,
	OrderStatusOption,
	OrderSummary,
	OrderSummaryLine,
} from "@/lib/contracts/order";
import { getVisibleProductReference, isSyntheticProductReference } from "@/lib/catalog/product-reference";
import { normalizeText } from "@/lib/utils/text";
import { getDataSource } from "@/lib/typeorm/data-source";
import {
	COMMERCIAL_VISIT_STATUS_IDS,
	COMMERCIAL_VISIT_TYPE_IDS,
	ORDER_PAYMENT_STATUS_IDS,
	ORDER_STATUS_IDS,
	PRODUCT_STATUS_IDS,
} from "@/lib/typeorm/constants/catalog-ids";
import { Product } from "@/lib/typeorm/entities/Product";
import { Client } from "@/lib/typeorm/entities/Client";
import { User } from "@/lib/typeorm/entities/User";
import { Order } from "@/lib/typeorm/entities/Order";
import { OrderLine } from "@/lib/typeorm/entities/OrderLine";
import { OrderPayment } from "@/lib/typeorm/entities/OrderPayment";
import { Promotion } from "@/lib/typeorm/entities/Promotion";
import { OrderPaymentStatus } from "@/lib/typeorm/entities/OrderPaymentStatus";
import { OrderStatus } from "@/lib/typeorm/entities/OrderStatus";
import { CommercialVisit } from "@/lib/typeorm/entities/CommercialVisit";
import { mapOrderDeliveryToSummary } from "@/lib/typeorm/services/orders/order-delivery";
import { ColorReference } from "@/lib/typeorm/entities/ColorReference";
import { ClientCommercialAssignment } from "@/lib/typeorm/entities/ClientCommercialAssignment";
import { listApplicableCustomerSegmentIdsForClient } from "@/lib/typeorm/services/clients/client-tier";
import { getClientByUserId } from "@/lib/typeorm/services/commercial/client";
import {
	canCommercialAccessClient,
} from "@/lib/typeorm/services/commercial/client-commercial-assignment";
import { requireCommercialByUserId } from "@/lib/typeorm/services/commercial/commercial";
import { getAgencyDeliveryFeeCents } from "@/lib/typeorm/services/orders/order-settings";
import { listColorReferences } from "@/lib/typeorm/services/catalog/color-chart";
import { listProducts } from "@/lib/typeorm/services/catalog/product";
import type { Repository } from "typeorm";

type CreateOrderInput = {
	clientId: string;
	createdByUserId: string;
	fulfillmentMethod?: OrderFulfillmentMethod | string | null;
	notes?: string | null;
	lines?: CreateOrderLineBody[];
};

type AddDraftOrderLineInput = {
	clientId: string;
	createdByUserId: string;
	productId: string;
	colorReferenceId?: string | null;
	quantity?: number | string | null;
};

type SaveDraftInput = {
	clientId: string;
	createdByUserId: string;
	fulfillmentMethod?: OrderFulfillmentMethod | string | null;
	notes?: string | null;
	lines?: CreateOrderLineBody[];
};

type ListOrdersForCommercialUserInput = {
	clientId?: string | null;
	paymentStatusId?: number | string | null;
	pendingDeliveryOnly?: boolean;
	statusId?: number | string | null;
};

type ListOrderProductOptionsInput = {
	clientId?: string | null;
};

type ListOrdersForAdminInput = {
	clientId?: string | null;
	paymentStatusId?: number | string | null;
	statusId?: number | string | null;
};

type UpdateOrderManagementInput = {
	actedByUserId?: string | null;
	orderId: string;
	paymentMethod?: string | null;
	paymentNotes?: string | null;
	paymentStatusId?: number | string | null;
	statusId?: number | string | null;
};

type RegisterOrderPaymentInput = {
	actedByUserId: string;
	amount?: number | string | null;
	orderId: string;
	paymentMethod?: string | null;
	paymentNotes?: string | null;
};

type NormalizedOrderLineInput = {
	productId: string;
	colorReferenceId: string | null;
	quantity: number;
};

type PreparedOrderLineRecord = {
	productId: string;
	colorReferenceId: string | null;
	quantity: number;
	unitPriceSnapshot: string;
	discountPercentage: string;
	lineTotal: string;
	orderReferenceSnapshot: string;
	variantCodeSnapshot: string | null;
	variantNameSnapshot: string | null;
};

type ActivePromotionDiscount = {
	id: string;
	title: string;
	benefit: string;
	discountPercentage: number;
	endDate: string;
	productId: string | null;
	productLineId: string | null;
	clientId: string | null;
	customerSegmentId: string | null;
};

const ORDER_STATUS_TRANSITION_IDS_BY_CODE: Record<string, number[]> = {
	created: [ORDER_STATUS_IDS.CONFIRMED, ORDER_STATUS_IDS.CANCELLED],
	confirmed: [ORDER_STATUS_IDS.CANCELLED],
	delivered: [],
	cancelled: [],
	draft: [],
};

const ORDER_PAYMENT_TRANSITION_IDS_BY_CODE: Record<string, number[]> = {
	pending: [ORDER_PAYMENT_STATUS_IDS.PAID],
	paid: [ORDER_PAYMENT_STATUS_IDS.PENDING],
};

const ORDER_PAYMENT_METHOD_CODES = new Set<OrderPaymentMethodCode>([
	"cash",
	"card",
	"transfer",
	"other",
]);

function normalizeFulfillmentMethod(
	value: OrderFulfillmentMethod | string | null | undefined,
): OrderFulfillmentMethod {
	return value === "agency" ? "agency" : "commercial";
}

const MAX_OPEN_UNPAID_ORDERS_PER_CLIENT = 2;

function toIsoString(value: Date | string | null | undefined) {
	if (!value) {
		return "";
	}

	return value instanceof Date ? value.toISOString() : String(value);
}

function parseMoneyToCents(value: string | number) {
	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new OrderServiceError(
			"Importe de producto no válido",
			500,
			"INVALID_PRODUCT_PRICE",
		);
	}

	return Math.round(parsed * 100);
}

function parseStoredMoneyToCents(value: string | number | null | undefined) {
	const parsed = Number(value);

	return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : 0;
}

function normalizePaymentAmountToCents(
	value: string | number | null | undefined,
) {
	const parsed = Number(String(value ?? "").trim().replace(",", "."));

	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new OrderServiceError(
			"Debes indicar un importe de cobro mayor que cero",
			400,
			"ORDER_PAYMENT_AMOUNT_INVALID",
		);
	}

	return Math.round(parsed * 100);
}

function formatCents(cents: number) {
	return (cents / 100).toFixed(2);
}

function parsePromotionDiscountPercentage(promotion: Promotion) {
	const normalizedType = normalizeText(promotion.promotion_type).toLowerCase();

	if (
		!normalizedType.includes("descuento") &&
		!normalizedType.includes("discount")
	) {
		return null;
	}

	const match = normalizeText(promotion.benefit)
		.replace(",", ".")
		.match(/(\d+(?:\.\d+)?)/);
	const parsed = Number(match?.[1]);

	if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
		return null;
	}

	return parsed;
}

function formatDiscountPercentage(discountPercentage: number) {
	return discountPercentage.toFixed(2);
}

function applyPercentageDiscountToCents(
	amountCents: number,
	discountPercentage: number,
) {
	const basisPoints = Math.round(discountPercentage * 100);
	const discountedAmount = Math.round(
		(amountCents * Math.max(0, 10000 - basisPoints)) / 10000,
	);

	return Math.max(0, discountedAmount);
}

function getPromotionSpecificityScore(promotion: ActivePromotionDiscount) {
	return (
		(promotion.clientId ? 8 : 0) +
		(promotion.customerSegmentId ? 4 : 0) +
		(promotion.productId ? 2 : 0) +
		(promotion.productLineId ? 1 : 0)
	);
}

function isPromotionDiscountBetter(
	candidate: ActivePromotionDiscount,
	current: ActivePromotionDiscount | null,
) {
	if (!current) {
		return true;
	}

	if (candidate.discountPercentage !== current.discountPercentage) {
		return candidate.discountPercentage > current.discountPercentage;
	}

	const candidateSpecificity = getPromotionSpecificityScore(candidate);
	const currentSpecificity = getPromotionSpecificityScore(current);

	if (candidateSpecificity !== currentSpecificity) {
		return candidateSpecificity > currentSpecificity;
	}

	return candidate.endDate < current.endDate;
}

function promotionAppliesToProduct(
	promotion: ActivePromotionDiscount,
	product: Product,
) {
	const targetsProduct = Boolean(promotion.productId);
	const targetsProductLine = Boolean(promotion.productLineId);

	if (!targetsProduct && !targetsProductLine) {
		return true;
	}

	return (
		promotion.productId === product.id ||
		promotion.productLineId === product.product_line_id
	);
}

function findBestPromotionDiscountForProduct(
	promotions: ActivePromotionDiscount[],
	product: Product,
) {
	return promotions.reduce<ActivePromotionDiscount | null>(
		(bestPromotion, promotion) => {
			if (!promotionAppliesToProduct(promotion, product)) {
				return bestPromotion;
			}

			return isPromotionDiscountBetter(promotion, bestPromotion)
				? promotion
				: bestPromotion;
		},
		null,
	);
}

function buildOrderLineMergeKey(line: {
	productId: string;
	colorReferenceId?: string | null;
}) {
	return `${line.productId}::${String(line.colorReferenceId ?? "").trim()}`;
}

function normalizeRequestedOrderLines(
	lines: CreateOrderLineBody[] | null | undefined,
	options: {
		allowEmpty?: boolean;
	} = {},
) {
	const sanitized = Array.isArray(lines) ? lines : [];

	if (sanitized.length === 0) {
		if (options.allowEmpty) {
			return [] as NormalizedOrderLineInput[];
		}

		throw new OrderServiceError(
			"Debes indicar al menos un producto para el pedido",
			400,
			"ORDER_LINES_REQUIRED",
		);
	}

	const merged = new Map<string, NormalizedOrderLineInput>();

	for (const line of sanitized) {
		const productId = String(line?.productId ?? "").trim();
		const colorReferenceId = String(line?.colorReferenceId ?? "").trim() || null;
		const quantity = Number(line?.quantity);

		if (!productId) {
			throw new OrderServiceError(
				"Cada línea del pedido debe indicar un producto",
				400,
				"ORDER_LINE_PRODUCT_REQUIRED",
			);
		}

		if (!Number.isInteger(quantity) || quantity <= 0) {
			throw new OrderServiceError(
				"La cantidad de cada línea debe ser un entero positivo",
				400,
				"ORDER_LINE_QUANTITY_INVALID",
			);
		}

		const key = buildOrderLineMergeKey({ productId, colorReferenceId });
		const current = merged.get(key);

		merged.set(key, {
			productId,
			colorReferenceId,
			quantity: (current?.quantity ?? 0) + quantity,
		});
	}

	return Array.from(merged.values());
}

function buildOrderSummaryLine(line: OrderLine): OrderSummaryLine {
	return {
		id: line.id,
		product_id: line.product_id,
		color_reference_id: line.color_reference_id ?? null,
		product_name: line.product?.name ?? "Producto",
		product_reference: getVisibleProductReference(line.product?.reference),
		order_reference: line.order_reference_snapshot,
		color_reference_code: line.variant_code_snapshot ?? null,
		color_reference_name: line.variant_name_snapshot ?? null,
		product_line_name: line.product?.productLine?.name ?? null,
		quantity: Number(line.quantity ?? 0),
		unit_price_snapshot: String(line.unit_price_snapshot ?? "0.00"),
		discount_percentage: String(line.discount_percentage ?? "0.00"),
		line_total: String(line.line_total ?? "0.00"),
	};
}

function buildOrderPaymentSummary(payment: OrderPayment): OrderPaymentSummary {
	return {
		id: payment.id,
		order_id: payment.order_id,
		amount: String(payment.amount ?? "0.00"),
		payment_method: payment.payment_method,
		notes: payment.notes ?? null,
		paid_at: toIsoString(payment.paid_at),
		registered_by_user_id: payment.registered_by_user_id ?? null,
		registered_by_user_name: payment.registeredByUser?.name ?? null,
		created_at: toIsoString(payment.created_at),
	};
}

function getOrderPaymentTotals(order: Order) {
	const totalCents = parseStoredMoneyToCents(order.total_amount);
	const paidCents = (order.payments ?? []).reduce(
		(total, payment) => total + parseStoredMoneyToCents(payment.amount),
		0,
	);
	const pendingCents = Math.max(0, totalCents - paidCents);

	return {
		totalCents,
		paidCents,
		pendingCents,
	};
}

function mapOrderToSummary(order: Order): OrderSummary {
	const sortedLines = [...(order.lines ?? [])].sort((a, b) => {
		const referenceCompare = String(a.order_reference_snapshot ?? "").localeCompare(
			String(b.order_reference_snapshot ?? ""),
			"es",
			{ sensitivity: "base" },
		);

		if (referenceCompare !== 0) {
			return referenceCompare;
		}

		return String(a.product?.name ?? "").localeCompare(
			String(b.product?.name ?? ""),
			"es",
			{ sensitivity: "base" },
		);
	});
	const sortedPayments = [...(order.payments ?? [])].sort((a, b) => {
		const paidAtCompare = String(a.paid_at ?? "").localeCompare(
			String(b.paid_at ?? ""),
		);

		if (paidAtCompare !== 0) {
			return paidAtCompare;
		}

		return String(a.created_at ?? "").localeCompare(String(b.created_at ?? ""));
	});
	const sortedDeliveries = [...(order.deliveries ?? [])].sort((a, b) =>
		String(a.created_at ?? "").localeCompare(String(b.created_at ?? "")),
	);
	const paymentTotals = getOrderPaymentTotals(order);

	return {
		id: order.id,
		client_id: order.client_id,
		client_name: order.client?.name ?? "Cliente",
		client_contact_name: order.client?.contact_name ?? null,
		fulfillment_method: normalizeFulfillmentMethod(order.fulfillment_method),
		agency_delivery_fee: String(order.agency_delivery_fee ?? "0.00"),
		created_by_user_id: order.created_by_user_id,
		created_by_user_name: order.createdByUser?.name ?? "Usuario",
		created_by_user_role_id: order.createdByUser?.role_id ?? null,
		status_id: order.status_id,
		status_code: order.status?.code ?? "",
		status_name: order.status?.name ?? "Sin estado",
		total_amount: String(order.total_amount ?? "0.00"),
		paid_amount: formatCents(paymentTotals.paidCents),
		pending_amount: formatCents(paymentTotals.pendingCents),
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
		lines: sortedLines.map(buildOrderSummaryLine),
		payments: sortedPayments.map(buildOrderPaymentSummary),
		deliveries: sortedDeliveries.map((delivery) => {
			delivery.order = order;
			return mapOrderDeliveryToSummary(delivery);
		}),
	};
}

function mapOrderStatusToOption(status: OrderStatus): OrderStatusOption {
	return {
		id: status.id,
		code: status.code,
		name: status.name,
	};
}

function mapOrderPaymentStatusToOption(
	status: OrderPaymentStatus,
): OrderPaymentStatusOption {
	return {
		id: status.id,
		code: status.code,
		name: status.name,
	};
}

function getAllowedOrderTransitionIds(statusCode: string | null | undefined) {
	return ORDER_STATUS_TRANSITION_IDS_BY_CODE[String(statusCode ?? "").trim()] ?? [];
}

function getAllowedOrderPaymentTransitionIds(order: Order) {
	if (order.status?.code !== "delivered") {
		return [] as number[];
	}

	return (
		ORDER_PAYMENT_TRANSITION_IDS_BY_CODE[
			String(order.paymentStatus?.code ?? "").trim()
		] ?? []
	);
}

function normalizeOrderStatusId(statusId: number | string | null | undefined) {
	const parsed = Number(statusId);

	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new OrderServiceError(
			"Debes indicar un estado de pedido válido",
			400,
			"ORDER_STATUS_ID_INVALID",
		);
	}

	return parsed;
}

function normalizeOrderPaymentStatusId(
	statusId: number | string | null | undefined,
) {
	const parsed = Number(statusId);

	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new OrderServiceError(
			"Debes indicar un estado de cobro válido",
			400,
			"ORDER_PAYMENT_STATUS_ID_INVALID",
		);
	}

	return parsed;
}

function normalizeOptionalFilterId(value: number | string | null | undefined) {
	if (value === null || value === undefined || String(value).trim() === "") {
		return null;
	}

	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new OrderServiceError(
			"El filtro indicado no es válido",
			400,
			"ORDER_FILTER_ID_INVALID",
		);
	}

	return parsed;
}

function normalizePaymentMethod(
	paymentMethod: string | null | undefined,
	options: {
		required?: boolean;
	} = {},
) {
	const normalized = normalizeText(paymentMethod)?.toLowerCase() ?? "";

	if (!normalized) {
		if (options.required) {
			throw new OrderServiceError(
				"Debes indicar el método de cobro del pedido",
				400,
				"ORDER_PAYMENT_METHOD_REQUIRED",
			);
		}

		return null;
	}

	if (!ORDER_PAYMENT_METHOD_CODES.has(normalized as OrderPaymentMethodCode)) {
		throw new OrderServiceError(
			"El método de cobro indicado no es válido",
			400,
			"ORDER_PAYMENT_METHOD_INVALID",
		);
	}

	return normalized as OrderPaymentMethodCode;
}

function ensureManageableOrder(order: Order) {
	if (order.status_id === ORDER_STATUS_IDS.DRAFT) {
		throw new OrderServiceError(
			"El pedido solicitado no existe",
			404,
			"ORDER_NOT_FOUND",
		);
	}
}

function ensureOrderTransitionAllowed(order: Order, nextStatusId: number) {
	if (order.status_id === nextStatusId) {
		return;
	}

	const allowedStatusIds = getAllowedOrderTransitionIds(order.status?.code);

	if (!allowedStatusIds.includes(nextStatusId)) {
		throw new OrderServiceError(
			`No se puede cambiar un pedido en estado ${order.status?.name ?? "actual"} al estado solicitado`,
			400,
			"ORDER_STATUS_TRANSITION_NOT_ALLOWED",
		);
	}
}

function isOrderFullyDeliveredByDeliveries(order: Order) {
	const activeDeliveries = (order.deliveries ?? []).filter(
		(delivery) => delivery.status !== "cancelled",
	);

	if (activeDeliveries.length === 0) {
		return true;
	}

	const deliveredByLineId = new Map<string, number>();

	for (const delivery of activeDeliveries) {
		if (delivery.status !== "delivered") {
			continue;
		}

		for (const deliveryLine of delivery.lines ?? []) {
			deliveredByLineId.set(
				deliveryLine.order_line_id,
				(deliveredByLineId.get(deliveryLine.order_line_id) ?? 0) +
					Number(deliveryLine.quantity ?? 0),
			);
		}
	}

	return (order.lines ?? []).every(
		(line) =>
			(deliveredByLineId.get(line.id) ?? 0) >= Number(line.quantity ?? 0),
	);
}

function ensureOrderPaymentTransitionAllowed(
	order: Order,
	nextPaymentStatusId: number,
) {
	if (order.status?.code !== "delivered") {
		throw new OrderServiceError(
			"Solo se puede registrar el cobro cuando el pedido ya consta como entregado",
			400,
			"ORDER_PAYMENT_REQUIRES_DELIVERED",
		);
	}

	if (order.payment_status_id === nextPaymentStatusId) {
		return;
	}

	const allowedPaymentStatusIds = getAllowedOrderPaymentTransitionIds(order);

	if (!allowedPaymentStatusIds.includes(nextPaymentStatusId)) {
		throw new OrderServiceError(
			`No se puede cambiar el cobro de un pedido en estado ${order.paymentStatus?.name ?? "actual"} al estado solicitado`,
			400,
			"ORDER_PAYMENT_STATUS_TRANSITION_NOT_ALLOWED",
		);
	}
}

async function listOrderStatusOptionsByIds(statusIds: number[]) {
	if (statusIds.length === 0) {
		return [] as OrderStatusOption[];
	}

	const ds = await getDataSource();
	const statuses = await ds
		.getRepository(OrderStatus)
		.createQueryBuilder("status")
		.where("status.id IN (:...statusIds)", { statusIds })
		.getMany();
	const statusMap = new Map(statuses.map((status) => [status.id, status]));

	return statusIds
		.map((statusId) => statusMap.get(statusId))
		.filter((status): status is OrderStatus => Boolean(status))
		.map(mapOrderStatusToOption);
}

async function listOrderPaymentStatusOptionsByIds(statusIds: number[]) {
	if (statusIds.length === 0) {
		return [] as OrderPaymentStatusOption[];
	}

	const ds = await getDataSource();
	const statuses = await ds
		.getRepository(OrderPaymentStatus)
		.createQueryBuilder("status")
		.where("status.id IN (:...statusIds)", { statusIds })
		.getMany();
	const statusMap = new Map(statuses.map((status) => [status.id, status]));

	return statusIds
		.map((statusId) => statusMap.get(statusId))
		.filter((status): status is OrderPaymentStatus => Boolean(status))
		.map(mapOrderPaymentStatusToOption);
}

async function buildOrderDetail(order: Order): Promise<OrderDetail> {
	const availableStatusTransitions = await listOrderStatusOptionsByIds(
		getAllowedOrderTransitionIds(order.status?.code),
	);
	const availablePaymentTransitions = await listOrderPaymentStatusOptionsByIds(
		getAllowedOrderPaymentTransitionIds(order),
	);

	return {
		order: mapOrderToSummary(order),
		availableStatusTransitions,
		availablePaymentTransitions,
	};
}

function createOrdersBaseQuery(repo: Repository<Order>) {
	return repo
		.createQueryBuilder("order")
		.leftJoinAndSelect("order.client", "client")
		.leftJoinAndSelect("order.createdByUser", "createdByUser")
		.leftJoinAndSelect("order.status", "status")
		.leftJoinAndSelect("order.paymentStatus", "paymentStatus")
		.leftJoinAndSelect("order.paidByUser", "paidByUser")
		.leftJoinAndSelect("order.payments", "payments")
		.leftJoinAndSelect("payments.registeredByUser", "paymentRegisteredByUser")
		.leftJoinAndSelect("order.deliveries", "deliveries")
		.leftJoinAndSelect("deliveries.commercial", "deliveryCommercial")
		.leftJoinAndSelect("deliveryCommercial.user", "deliveryCommercialUser")
		.leftJoinAndSelect("deliveries.deliveryVisit", "deliveryVisitForReparto")
		.leftJoinAndSelect(
			"deliveryVisitForReparto.status",
			"deliveryVisitForRepartoStatus",
		)
		.leftJoinAndSelect("deliveries.lines", "deliveryLines")
		.leftJoinAndSelect("deliveryLines.orderLine", "deliveryOrderLine")
		.leftJoinAndSelect("deliveryOrderLine.product", "deliveryLineProduct")
		.leftJoinAndSelect(
			"deliveryLineProduct.productLine",
			"deliveryLineProductLine",
		)
		.leftJoinAndSelect(
			"deliveryOrderLine.colorReference",
			"deliveryLineColorReference",
		)
		.leftJoinAndSelect("order.deliveryVisit", "deliveryVisit")
		.leftJoinAndSelect("deliveryVisit.status", "deliveryVisitStatus")
		.leftJoinAndSelect("order.lines", "lines")
		.leftJoinAndSelect("lines.product", "product")
		.leftJoinAndSelect("lines.colorReference", "colorReference")
		.leftJoinAndSelect("product.productLine", "productLine");
}

function createCommercialOrdersBaseQuery(
	repo: Repository<Order>,
	commercialId: string,
) {
	return createOrdersBaseQuery(repo)
		.innerJoin(
			ClientCommercialAssignment,
			"assignment",
			[
				"assignment.client_id = order.client_id",
				"assignment.commercial_id = :commercialId",
				"assignment.unassigned_at IS NULL",
			].join(" AND "),
			{ commercialId },
		)
		.andWhere("order.status_id != :draftStatusId", {
			draftStatusId: ORDER_STATUS_IDS.DRAFT,
		});
}

async function getOrderById(orderId: string) {
	const ds = await getDataSource();
	const repo = ds.getRepository(Order);

	return createOrdersBaseQuery(repo)
		.where("order.id = :orderId", { orderId })
		.orderBy("order.created_at", "DESC")
		.addOrderBy("lines.order_reference_snapshot", "ASC")
		.addOrderBy("product.name", "ASC")
		.getOne();
}

async function getRequiredOrderById(orderId: string) {
	const order = await getOrderById(orderId);

	if (!order) {
		throw new OrderServiceError(
			"El pedido solicitado no existe",
			404,
			"ORDER_NOT_FOUND",
		);
	}

	return order;
}

async function updateOrderManagementRecord(
	order: Order,
	input: Omit<UpdateOrderManagementInput, "orderId">,
) {
	ensureManageableOrder(order);
	const hasStatusUpdate = input.statusId !== undefined;
	const hasPaymentUpdate = input.paymentStatusId !== undefined;

	if (
		!hasStatusUpdate &&
		!hasPaymentUpdate &&
		input.paymentMethod === undefined &&
		input.paymentNotes === undefined
	) {
		throw new OrderServiceError(
			"Debes indicar al menos un cambio válido para el pedido",
			400,
			"ORDER_UPDATE_EMPTY",
		);
	}

	if (
		input.paymentStatusId === undefined &&
		(input.paymentMethod !== undefined || input.paymentNotes !== undefined)
	) {
		throw new OrderServiceError(
			"Para registrar un cobro debes indicar también el estado de cobro",
			400,
			"ORDER_PAYMENT_STATUS_REQUIRED",
		);
	}

	const nextStatusId = hasStatusUpdate
		? normalizeOrderStatusId(input.statusId)
		: order.status_id;

	if (hasStatusUpdate) {
		ensureOrderTransitionAllowed(order, nextStatusId);

		if (
			nextStatusId === ORDER_STATUS_IDS.DELIVERED &&
			!isOrderFullyDeliveredByDeliveries(order)
		) {
			throw new OrderServiceError(
				"No se puede marcar el pedido como entregado hasta completar todos sus repartos",
				409,
				"ORDER_DELIVERIES_PENDING",
			);
		}
	}

	let nextPaymentStatusId = order.payment_status_id;
	let nextPaymentMethod = order.payment_method ?? null;
	let nextPaymentNotes = order.payment_notes ?? null;
	let nextPaidAt = order.paid_at ?? null;
	let nextPaidByUserId = order.paid_by_user_id ?? null;

	if (hasPaymentUpdate) {
		nextPaymentStatusId = normalizeOrderPaymentStatusId(input.paymentStatusId);
		ensureOrderPaymentTransitionAllowed(order, nextPaymentStatusId);
		nextPaymentNotes =
			input.paymentNotes === undefined
				? order.payment_notes ?? null
				: normalizeText(input.paymentNotes) || null;

		if (nextPaymentStatusId === ORDER_PAYMENT_STATUS_IDS.PAID) {
			nextPaymentMethod = normalizePaymentMethod(input.paymentMethod, {
				required: true,
			});
			nextPaidAt = new Date();
			nextPaidByUserId = String(input.actedByUserId ?? "").trim() || null;

			if (!nextPaidByUserId) {
				throw new OrderServiceError(
					"No se ha podido identificar el usuario que registra el cobro",
					500,
					"ORDER_PAYMENT_ACTOR_REQUIRED",
				);
			}
		} else {
			if ((order.payments ?? []).length > 0) {
				throw new OrderServiceError(
					"No se puede marcar como pendiente un pedido con pagos registrados",
					409,
					"ORDER_PAYMENT_HISTORY_EXISTS",
				);
			}

			nextPaymentMethod = null;
			nextPaidAt = null;
			nextPaidByUserId = null;
		}
	}
	const paymentTotals = getOrderPaymentTotals(order);
	const shouldCreateLegacyPayment =
		hasPaymentUpdate &&
		nextPaymentStatusId === ORDER_PAYMENT_STATUS_IDS.PAID &&
		paymentTotals.pendingCents > 0;

	const shouldUpdate =
		order.status_id !== nextStatusId ||
		order.delivery_visit_id !==
			(nextStatusId === ORDER_STATUS_IDS.CANCELLED
				? null
				: order.delivery_visit_id ?? null) ||
		order.payment_status_id !== nextPaymentStatusId ||
		(order.payment_method ?? null) !== nextPaymentMethod ||
		(order.payment_notes ?? null) !== nextPaymentNotes ||
		String(order.paid_at?.toISOString?.() ?? order.paid_at ?? "") !==
			String(nextPaidAt?.toISOString?.() ?? nextPaidAt ?? "") ||
		(order.paid_by_user_id ?? null) !== nextPaidByUserId;

	if (shouldUpdate) {
		const ds = await getDataSource();
		const nextDeliveryVisitId =
			nextStatusId === ORDER_STATUS_IDS.CANCELLED
				? null
				: order.delivery_visit_id ?? null;

		await ds.transaction(async (manager) => {
			const orderRepo = manager.getRepository(Order);

			if (shouldCreateLegacyPayment) {
				await manager.getRepository(OrderPayment).save(
					manager.getRepository(OrderPayment).create({
						order_id: order.id,
						amount: formatCents(paymentTotals.pendingCents),
						payment_method: nextPaymentMethod ?? "other",
						notes: nextPaymentNotes,
						paid_at: nextPaidAt ?? new Date(),
						registered_by_user_id: nextPaidByUserId,
					}),
				);
			}

			await orderRepo.save(
				orderRepo.create({
					id: order.id,
					status_id: nextStatusId,
					delivery_visit_id: nextDeliveryVisitId,
					payment_status_id: nextPaymentStatusId,
					payment_method: nextPaymentMethod,
					payment_notes: nextPaymentNotes,
					paid_at: nextPaidAt,
					paid_by_user_id: nextPaidByUserId,
				}),
			);

			if (
				nextStatusId === ORDER_STATUS_IDS.CANCELLED &&
				order.delivery_visit_id
			) {
				const visitRepo = manager.getRepository(CommercialVisit);
				const linkedVisit = await visitRepo.findOne({
					where: { id: order.delivery_visit_id },
				});

				if (
					linkedVisit &&
					linkedVisit.visit_type_id === COMMERCIAL_VISIT_TYPE_IDS.DELIVERY &&
					(linkedVisit.status_id === COMMERCIAL_VISIT_STATUS_IDS.PLANNED ||
						linkedVisit.status_id === COMMERCIAL_VISIT_STATUS_IDS.POSTPONED)
				) {
					const remainingConfirmedOrders = await orderRepo.count({
						where: {
							delivery_visit_id: order.delivery_visit_id,
							status_id: ORDER_STATUS_IDS.CONFIRMED,
						},
					});

					if (remainingConfirmedOrders === 0) {
						await visitRepo.update(
							{ id: order.delivery_visit_id },
							{ status_id: COMMERCIAL_VISIT_STATUS_IDS.CANCELLED },
						);
					}
				}
			}
		});
	}

	const updatedOrder = await getRequiredOrderById(order.id);
	return buildOrderDetail(updatedOrder);
}

async function registerOrderPaymentRecord(
	order: Order,
	input: Omit<RegisterOrderPaymentInput, "orderId">,
) {
	ensureManageableOrder(order);

	if (order.status?.code !== "delivered") {
		throw new OrderServiceError(
			"Solo se puede registrar un cobro cuando el pedido ya consta como entregado",
			400,
			"ORDER_PAYMENT_REQUIRES_DELIVERED",
		);
	}

	const paymentTotals = getOrderPaymentTotals(order);

	if (paymentTotals.pendingCents <= 0) {
		throw new OrderServiceError(
			"Este pedido ya esta cobrado por completo",
			409,
			"ORDER_ALREADY_PAID",
		);
	}

	const paymentAmountCents = normalizePaymentAmountToCents(input.amount);

	if (paymentAmountCents > paymentTotals.pendingCents) {
		throw new OrderServiceError(
			"El importe indicado supera el pendiente de cobro del pedido",
			400,
			"ORDER_PAYMENT_AMOUNT_EXCEEDS_PENDING",
		);
	}

	const paymentMethod = normalizePaymentMethod(input.paymentMethod, {
		required: true,
	});

	if (!paymentMethod) {
		throw new OrderServiceError(
			"Debes indicar el método de cobro del pedido",
			400,
			"ORDER_PAYMENT_METHOD_REQUIRED",
		);
	}

	const paymentNotes = normalizeText(input.paymentNotes) || null;
	const actedByUserId = String(input.actedByUserId ?? "").trim();

	if (!actedByUserId) {
		throw new OrderServiceError(
			"No se ha podido identificar el usuario que registra el cobro",
			500,
			"ORDER_PAYMENT_ACTOR_REQUIRED",
		);
	}

	const paidAt = new Date();
	const nextPaidCents = paymentTotals.paidCents + paymentAmountCents;
	const isFullyPaid = nextPaidCents >= paymentTotals.totalCents;
	const ds = await getDataSource();

	await ds.transaction(async (manager) => {
		await manager.getRepository(OrderPayment).save(
			manager.getRepository(OrderPayment).create({
				order_id: order.id,
				amount: formatCents(paymentAmountCents),
				payment_method: paymentMethod,
				notes: paymentNotes,
				paid_at: paidAt,
				registered_by_user_id: actedByUserId,
			}),
		);

		const orderRepo = manager.getRepository(Order);

		await orderRepo.save(
			orderRepo.create({
				id: order.id,
				payment_status_id: isFullyPaid
					? ORDER_PAYMENT_STATUS_IDS.PAID
					: ORDER_PAYMENT_STATUS_IDS.PENDING,
				payment_method: paymentMethod,
				payment_notes: paymentNotes,
				paid_at: isFullyPaid ? paidAt : null,
				paid_by_user_id: isFullyPaid ? actedByUserId : null,
			}),
		);
	});

	const updatedOrder = await getRequiredOrderById(order.id);
	return buildOrderDetail(updatedOrder);
}

async function findDraftOrderId(
	manager: Awaited<ReturnType<typeof getDataSource>>["manager"],
	clientId: string,
	createdByUserId: string,
) {
	const draftOrder = await manager.getRepository(Order).findOne({
		where: {
			client_id: clientId,
			created_by_user_id: createdByUserId,
			status_id: ORDER_STATUS_IDS.DRAFT,
		},
		order: {
			updated_at: "DESC",
		},
	});

	return draftOrder?.id ?? null;
}

async function ensureOrderActors(
	manager: Awaited<ReturnType<typeof getDataSource>>["manager"],
	input: {
		clientId: string;
		createdByUserId: string;
	},
) {
	const clientRepo = manager.getRepository(Client);
	const userRepo = manager.getRepository(User);

	const client = await clientRepo.findOne({
		where: { id: input.clientId },
	});
	const createdByUser = await userRepo.findOne({
		where: { id: input.createdByUserId },
	});

	if (!client) {
		throw new OrderServiceError(
			"Cliente no encontrado",
			404,
			"ORDER_CLIENT_NOT_FOUND",
		);
	}

	if (!createdByUser) {
		throw new OrderServiceError(
			"Usuario creador no encontrado",
			404,
			"ORDER_CREATED_BY_NOT_FOUND",
		);
	}
}

async function listActivePromotionDiscountsForClient(
	manager: Awaited<ReturnType<typeof getDataSource>>["manager"],
	clientId: string,
) {
	const today = new Date().toISOString().slice(0, 10);
	const applicableSegmentIds = await listApplicableCustomerSegmentIdsForClient(
		manager,
		clientId,
	);
	const segmentPromotionPredicate = applicableSegmentIds.length
		? "OR promotion.customer_segment_id IN (:...applicableSegmentIds)"
		: "";
	const queryParameters = applicableSegmentIds.length
		? { clientId, applicableSegmentIds }
		: { clientId };
	const promotions = await manager
		.getRepository(Promotion)
		.createQueryBuilder("promotion")
		.where("promotion.status = :status", { status: "active" })
		.andWhere("promotion.start_date <= :today", { today })
		.andWhere("promotion.end_date >= :today", { today })
		.andWhere(
			[
				"(",
				"(promotion.client_id IS NULL AND promotion.customer_segment_id IS NULL)",
				"OR promotion.client_id = :clientId",
				segmentPromotionPredicate,
				")",
			].join(" "),
			queryParameters,
		)
		.getMany();

	return promotions
		.map((promotion) => {
			const discountPercentage = parsePromotionDiscountPercentage(promotion);

			if (discountPercentage === null) {
				return null;
			}

			return {
				id: promotion.id,
				title: promotion.title,
				benefit: promotion.benefit,
				discountPercentage,
				endDate: promotion.end_date,
				productId: promotion.product_id,
				productLineId: promotion.product_line_id,
				clientId: promotion.client_id,
				customerSegmentId: promotion.customer_segment_id,
			} satisfies ActivePromotionDiscount;
		})
		.filter(
			(promotion): promotion is ActivePromotionDiscount => promotion !== null,
		);
}

async function prepareOrderLineRecords(
	manager: Awaited<ReturnType<typeof getDataSource>>["manager"],
	clientId: string,
	lines: NormalizedOrderLineInput[],
) {
	if (lines.length === 0) {
		return {
			totalAmountCents: 0,
			lineRecords: [] as PreparedOrderLineRecord[],
		};
	}

	const productRepo = manager.getRepository(Product);
	const colorReferenceRepo = manager.getRepository(ColorReference);
	const productIds = Array.from(new Set(lines.map((line) => line.productId)));
	const colorReferenceIds = Array.from(
		new Set(
			lines
				.map((line) => String(line.colorReferenceId ?? "").trim())
				.filter(Boolean),
		),
	);

	const products = await productRepo
		.createQueryBuilder("product")
		.leftJoinAndSelect("product.productLine", "productLine")
		.where("product.id IN (:...productIds)", { productIds })
		.andWhere("product.status_id = :statusId", {
			statusId: PRODUCT_STATUS_IDS.ACTIVE,
		})
		.getMany();
	const colorReferences =
		colorReferenceIds.length > 0
			? await colorReferenceRepo
					.createQueryBuilder("colorReference")
					.where("colorReference.id IN (:...colorReferenceIds)", {
						colorReferenceIds,
					})
					.andWhere("colorReference.is_orderable = true")
					.getMany()
			: ([] as ColorReference[]);
	const productVariantCounts = await colorReferenceRepo
		.createQueryBuilder("colorReference")
		.select("colorReference.product_id", "productId")
		.addSelect("COUNT(*)", "count")
		.where("colorReference.product_id IN (:...productIds)", { productIds })
		.andWhere("colorReference.is_orderable = true")
		.groupBy("colorReference.product_id")
		.getRawMany<{ productId: string; count: string }>();

	if (products.length !== productIds.length) {
		throw new OrderServiceError(
			"Uno o varios productos del pedido ya no estan disponibles",
			400,
			"ORDER_PRODUCTS_NOT_AVAILABLE",
		);
	}

	const productMap = new Map(products.map((product) => [product.id, product]));
	const colorReferenceMap = new Map(
		colorReferences.map((colorReference) => [colorReference.id, colorReference]),
	);
	const productVariantCountMap = new Map(
		productVariantCounts.map((row) => [row.productId, Number(row.count ?? 0)]),
	);
	const activePromotionDiscounts =
		await listActivePromotionDiscountsForClient(manager, clientId);

	let totalAmountCents = 0;
	const lineRecords = lines.map((line) => {
		const product = productMap.get(line.productId);

		if (!product) {
			throw new OrderServiceError(
				"Producto de pedido no encontrado",
				400,
				"ORDER_PRODUCT_NOT_FOUND",
			);
		}

		const orderableVariantCount = productVariantCountMap.get(product.id) ?? 0;
		const selectedColorReference = line.colorReferenceId
			? colorReferenceMap.get(line.colorReferenceId)
			: null;

		if (line.colorReferenceId && !selectedColorReference) {
			throw new OrderServiceError(
				"La referencia de color indicada ya no esta disponible",
				400,
				"ORDER_COLOR_REFERENCE_NOT_AVAILABLE",
			);
		}

		if (
			selectedColorReference &&
			selectedColorReference.product_id !== product.id
		) {
			throw new OrderServiceError(
				"La referencia de color no pertenece al producto seleccionado",
				400,
				"ORDER_COLOR_REFERENCE_PRODUCT_MISMATCH",
			);
		}

		if (orderableVariantCount > 0 && !selectedColorReference) {
			throw new OrderServiceError(
				"Debes indicar el tono o referencia exacta para este producto de coloración",
				400,
				"ORDER_COLOR_REFERENCE_REQUIRED",
			);
		}

		if (
			orderableVariantCount === 0 &&
			selectedColorReference &&
			isSyntheticProductReference(product.reference)
		) {
			throw new OrderServiceError(
				"El producto seleccionado no admite esa referencia de color",
				400,
				"ORDER_COLOR_REFERENCE_NOT_ALLOWED",
			);
		}

		const unitPriceCents = parseMoneyToCents(product.base_price);
		const lineSubtotalCents = unitPriceCents * line.quantity;
		const promotionDiscount = findBestPromotionDiscountForProduct(
			activePromotionDiscounts,
			product,
		);
		const discountPercentage = promotionDiscount?.discountPercentage ?? 0;
		const lineTotalCents =
			discountPercentage > 0
				? applyPercentageDiscountToCents(
						lineSubtotalCents,
						discountPercentage,
					)
				: lineSubtotalCents;
		totalAmountCents += lineTotalCents;

		return {
			productId: product.id,
			colorReferenceId: selectedColorReference?.id ?? null,
			quantity: line.quantity,
			unitPriceSnapshot: formatCents(unitPriceCents),
			discountPercentage: formatDiscountPercentage(discountPercentage),
			lineTotal: formatCents(lineTotalCents),
			orderReferenceSnapshot:
				selectedColorReference?.erp_reference ||
				selectedColorReference?.code ||
				product.reference,
			variantCodeSnapshot: selectedColorReference?.code ?? null,
			variantNameSnapshot: selectedColorReference?.name ?? null,
		};
	});

	return {
		totalAmountCents,
		lineRecords,
	};
}

async function persistOrderRecord(
	manager: Awaited<ReturnType<typeof getDataSource>>["manager"],
	input: {
		existingOrderId?: string | null;
		clientId: string;
		createdByUserId: string;
		fulfillmentMethod?: OrderFulfillmentMethod | string | null;
		statusId: number;
		notes?: string | null;
		lines: NormalizedOrderLineInput[];
	},
) {
	await ensureOrderActors(manager, input);

	const orderRepo = manager.getRepository(Order);
	const orderLineRepo = manager.getRepository(OrderLine);
	const { totalAmountCents, lineRecords } = await prepareOrderLineRecords(
		manager,
		input.clientId,
		input.lines,
	);
	const fulfillmentMethod = normalizeFulfillmentMethod(input.fulfillmentMethod);
	const agencyDeliveryFeeCents =
		fulfillmentMethod === "agency"
			? await getAgencyDeliveryFeeCents(manager)
			: 0;
	const finalTotalAmountCents = totalAmountCents + agencyDeliveryFeeCents;

	const currentOrder =
		input.existingOrderId
			? await orderRepo.findOne({
					where: { id: input.existingOrderId },
				})
			: null;

	const savedOrder = await orderRepo.save(
		orderRepo.create({
			id: currentOrder?.id,
			client_id: input.clientId,
			created_by_user_id: input.createdByUserId,
			status_id: input.statusId,
			delivery_visit_id: currentOrder?.delivery_visit_id ?? null,
			total_amount: formatCents(finalTotalAmountCents),
			fulfillment_method: fulfillmentMethod,
			agency_delivery_fee: formatCents(agencyDeliveryFeeCents),
			notes: normalizeText(input.notes) || null,
		}),
	);

	await orderLineRepo.delete({
		order_id: savedOrder.id,
	});

	if (lineRecords.length > 0) {
		await orderLineRepo.save(
			lineRecords.map((line) =>
				orderLineRepo.create({
					order_id: savedOrder.id,
					product_id: line.productId,
					color_reference_id: line.colorReferenceId,
					quantity: line.quantity,
					unit_price_snapshot: line.unitPriceSnapshot,
					discount_percentage: line.discountPercentage,
					line_total: line.lineTotal,
					order_reference_snapshot: line.orderReferenceSnapshot,
					variant_code_snapshot: line.variantCodeSnapshot,
					variant_name_snapshot: line.variantNameSnapshot,
				}),
			),
		);
	}

	return savedOrder.id;
}

async function countOpenUnpaidOrdersForClient(
	manager: Awaited<ReturnType<typeof getDataSource>>["manager"],
	clientId: string,
) {
	return manager
		.getRepository(Order)
		.createQueryBuilder("order")
		.where("order.client_id = :clientId", { clientId })
		.andWhere("order.status_id NOT IN (:...excludedStatusIds)", {
			excludedStatusIds: [ORDER_STATUS_IDS.DRAFT, ORDER_STATUS_IDS.CANCELLED],
		})
		.andWhere("order.payment_status_id != :paidStatusId", {
			paidStatusId: ORDER_PAYMENT_STATUS_IDS.PAID,
		})
		.getCount();
}

async function ensureClientCanRegisterOrder(
	manager: Awaited<ReturnType<typeof getDataSource>>["manager"],
	clientId: string,
) {
	const openUnpaidOrdersCount = await countOpenUnpaidOrdersForClient(
		manager,
		clientId,
	);

	if (openUnpaidOrdersCount >= MAX_OPEN_UNPAID_ORDERS_PER_CLIENT) {
		throw new OrderServiceError(
			`Este cliente ya tiene ${MAX_OPEN_UNPAID_ORDERS_PER_CLIENT} pedidos registrados pendientes de cobro. No se pueden registrar mas pedidos hasta cerrar al menos uno.`,
			409,
			"ORDER_OPEN_LIMIT_REACHED",
		);
	}
}

async function loadDraftOrderSummary(
	clientId: string,
	createdByUserId: string,
) {
	const ds = await getDataSource();
	const refreshedDraftId = await ds.transaction(async (manager) => {
		const repo = manager.getRepository(Order);
		const draftOrder = await createOrdersBaseQuery(repo)
			.where("order.client_id = :clientId", { clientId })
			.andWhere("order.created_by_user_id = :createdByUserId", {
				createdByUserId,
			})
			.andWhere("order.status_id = :statusId", {
				statusId: ORDER_STATUS_IDS.DRAFT,
			})
			.orderBy("order.updated_at", "DESC")
			.addOrderBy("lines.order_reference_snapshot", "ASC")
			.addOrderBy("product.name", "ASC")
			.getOne();

		if (!draftOrder) {
			return null;
		}

		const currentLines = normalizeRequestedOrderLines(
			draftOrder.lines.map((line) => ({
				productId: line.product_id,
				colorReferenceId: line.color_reference_id,
				quantity: line.quantity,
			})),
			{ allowEmpty: true },
		);

		if (currentLines.length === 0) {
			await manager.getRepository(Order).delete({ id: draftOrder.id });
			return null;
		}

		return persistOrderRecord(manager, {
			existingOrderId: draftOrder.id,
			clientId,
			createdByUserId,
			fulfillmentMethod: draftOrder.fulfillment_method,
			statusId: ORDER_STATUS_IDS.DRAFT,
			notes: draftOrder.notes,
			lines: currentLines,
		});
	});

	if (!refreshedDraftId) {
		return null;
	}

	const refreshedDraft = await getOrderById(refreshedDraftId);
	return refreshedDraft ? mapOrderToSummary(refreshedDraft) : null;
}

async function saveDraftRecord(input: SaveDraftInput) {
	const ds = await getDataSource();
	const normalizedLines = normalizeRequestedOrderLines(input.lines, {
		allowEmpty: true,
	});

	return ds.transaction(async (manager) => {
		const existingDraftId = await findDraftOrderId(
			manager,
			input.clientId,
			input.createdByUserId,
		);

		if (normalizedLines.length === 0) {
			if (existingDraftId) {
				await manager.getRepository(Order).delete({
					id: existingDraftId,
				});
			}

			return null;
		}

		const draftOrderId = await persistOrderRecord(manager, {
			existingOrderId: existingDraftId,
			clientId: input.clientId,
			createdByUserId: input.createdByUserId,
			fulfillmentMethod: input.fulfillmentMethod,
			statusId: ORDER_STATUS_IDS.DRAFT,
			notes: input.notes,
			lines: normalizedLines,
		});

		return draftOrderId;
	}).then((draftOrderId) =>
		draftOrderId ? getOrderById(draftOrderId).then((order) => (order ? mapOrderToSummary(order) : null)) : null,
	);
}

async function addLineToDraftRecord(input: AddDraftOrderLineInput) {
	const currentDraft = await loadDraftOrderSummary(
		input.clientId,
		input.createdByUserId,
	);

	const nextLines: CreateOrderLineBody[] = [
		...(currentDraft?.lines.map((line) => ({
			productId: line.product_id,
			colorReferenceId: line.color_reference_id,
			quantity: line.quantity,
		})) ?? []),
		{
			productId: input.productId,
			colorReferenceId: input.colorReferenceId ?? null,
			quantity: input.quantity ?? 1,
		},
	];

	return saveDraftRecord({
		clientId: input.clientId,
		createdByUserId: input.createdByUserId,
		fulfillmentMethod: currentDraft?.fulfillment_method ?? "commercial",
		notes: currentDraft?.notes ?? null,
		lines: nextLines,
	});
}

async function submitOrderRecord(input: CreateOrderInput) {
	const ds = await getDataSource();
	const normalizedLines = normalizeRequestedOrderLines(input.lines);

	const createdOrderId = await ds.transaction(async (manager) => {
		await ensureClientCanRegisterOrder(manager, input.clientId);

		const existingDraftId = await findDraftOrderId(
			manager,
			input.clientId,
			input.createdByUserId,
		);

		return persistOrderRecord(manager, {
			existingOrderId: existingDraftId,
			clientId: input.clientId,
			createdByUserId: input.createdByUserId,
			fulfillmentMethod: input.fulfillmentMethod,
			statusId: ORDER_STATUS_IDS.CREATED,
			notes: input.notes,
			lines: normalizedLines,
		});
	});

	const createdOrder = await getOrderById(createdOrderId);

	if (!createdOrder) {
		throw new OrderServiceError(
			"No se pudo recuperar el pedido creado",
			500,
			"ORDER_CREATED_NOT_RECOVERED",
		);
	}

	return mapOrderToSummary(createdOrder);
}

export class OrderServiceError extends Error {
	status: number;
	code: string;

	constructor(message: string, status = 400, code = "ORDER_SERVICE_ERROR") {
		super(message);
		this.name = "OrderServiceError";
		this.status = status;
		this.code = code;
	}
}

export async function listOrderProductOptions(
	input: ListOrderProductOptionsInput = {},
): Promise<OrderProductOption[]> {
	const [products, orderableColorReferences] = await Promise.all([
		listProducts({
			statusId: PRODUCT_STATUS_IDS.ACTIVE,
		}),
		listColorReferences({
			orderableOnly: true,
		}),
	]);
	const clientId = String(input.clientId ?? "").trim();
	const activePromotionDiscounts = clientId
		? await getDataSource().then((ds) =>
				listActivePromotionDiscountsForClient(ds.manager, clientId),
			)
		: [];

	const colorReferencesByProductId = orderableColorReferences.reduce<
		Map<string, Awaited<ReturnType<typeof listColorReferences>>>
	>((acc, colorReference) => {
		if (!colorReference.product_id) {
			return acc;
		}

		const current = acc.get(colorReference.product_id) ?? [];
		current.push(colorReference);
		acc.set(colorReference.product_id, current);
		return acc;
	}, new Map());

	const options: OrderProductOption[] = [];

	for (const product of products) {
		const linkedColorReferences =
			colorReferencesByProductId.get(product.id)?.sort((a, b) => {
				const displayOrderCompare = a.display_order - b.display_order;

				if (displayOrderCompare !== 0) {
					return displayOrderCompare;
				}

				return String(a.erp_reference ?? a.code).localeCompare(
					String(b.erp_reference ?? b.code),
					"es",
					{ sensitivity: "base" },
				);
			}) ?? [];

		if (linkedColorReferences.length > 0) {
			for (const colorReference of linkedColorReferences) {
				const promotionDiscount = findBestPromotionDiscountForProduct(
					activePromotionDiscounts,
					product,
				);

				options.push({
					id: `${product.id}::${colorReference.id}`,
					productId: product.id,
					colorReferenceId: colorReference.id,
					name: product.name,
					reference: getVisibleProductReference(product.reference),
					orderReference:
						colorReference.erp_reference ?? colorReference.code,
					colorReferenceCode: colorReference.code,
					colorReferenceName: colorReference.name,
					isColorReference: true,
					productCategoryName: product.productCategory?.name ?? null,
					productLineName: product.productLine?.name ?? null,
					imageUrl:
						colorReference.image_url ??
						colorReference.thumb_image_url ??
						product.image_url ??
						product.productLine?.image_url ??
						null,
					basePrice: product.base_price,
					discountPercentage: formatDiscountPercentage(
						promotionDiscount?.discountPercentage ?? 0,
					),
					discountTitle: promotionDiscount?.title ?? null,
					discountBenefit: promotionDiscount?.benefit ?? null,
					format: product.format ?? null,
					packing: product.packing ?? null,
				});
			}

			continue;
		}

		if (isSyntheticProductReference(product.reference)) {
			continue;
		}

		const promotionDiscount = findBestPromotionDiscountForProduct(
			activePromotionDiscounts,
			product,
		);

		options.push({
			id: product.id,
			productId: product.id,
			colorReferenceId: null,
			name: product.name,
			reference: product.reference,
			orderReference: product.reference,
			colorReferenceCode: null,
			colorReferenceName: null,
			isColorReference: false,
			productCategoryName: product.productCategory?.name ?? null,
			productLineName: product.productLine?.name ?? null,
			imageUrl: product.image_url ?? product.productLine?.image_url ?? null,
			basePrice: product.base_price,
			discountPercentage: formatDiscountPercentage(
				promotionDiscount?.discountPercentage ?? 0,
			),
			discountTitle: promotionDiscount?.title ?? null,
			discountBenefit: promotionDiscount?.benefit ?? null,
			format: product.format ?? null,
			packing: product.packing ?? null,
		});
	}

	return options.sort((a, b) => {
		const categoryCompare = String(a.productCategoryName ?? "").localeCompare(
			String(b.productCategoryName ?? ""),
			"es",
			{ sensitivity: "base" },
		);

		if (categoryCompare !== 0) {
			return categoryCompare;
		}

		const lineCompare = String(a.productLineName ?? "").localeCompare(
			String(b.productLineName ?? ""),
			"es",
			{ sensitivity: "base" },
		);

		if (lineCompare !== 0) {
			return lineCompare;
		}

		const productCompare = a.name.localeCompare(b.name, "es", {
			sensitivity: "base",
		});

		if (productCompare !== 0) {
			return productCompare;
		}

		return a.orderReference.localeCompare(b.orderReference, "es", {
			sensitivity: "base",
		});
	});
}

export async function listOrderProductOptionsForClientUser(userId: string) {
	const client = await getClientByUserId(userId);

	if (!client) {
		throw new OrderServiceError(
			"No existe ficha de cliente para este usuario",
			404,
			"ORDER_CLIENT_PROFILE_NOT_FOUND",
		);
	}

	return listOrderProductOptions({ clientId: client.id });
}

export async function listOrderProductOptionsForCommercialUser(
	userId: string,
	input: {
		clientId?: string | null;
	} = {},
) {
	const clientId = String(input.clientId ?? "").trim();

	if (!clientId) {
		return listOrderProductOptions();
	}

	const commercial = await requireCommercialByUserId(userId);
	const canAccessClient = await canCommercialAccessClient(
		commercial.id,
		clientId,
	);

	if (!canAccessClient) {
		throw new OrderServiceError(
			"El cliente indicado no esta asignado a este comercial",
			403,
			"ORDER_CLIENT_NOT_ASSIGNED",
		);
	}

	return listOrderProductOptions({ clientId });
}

export async function listOrdersByClientId(
	clientId: string,
	input: {
		includeDraft?: boolean;
	} = {},
) {
	const ds = await getDataSource();
	const repo = ds.getRepository(Order);
	const query = createOrdersBaseQuery(repo)
		.where("order.client_id = :clientId", { clientId })
		.orderBy("order.created_at", "DESC")
		.addOrderBy("lines.order_reference_snapshot", "ASC")
		.addOrderBy("product.name", "ASC");

	if (!input.includeDraft) {
		query.andWhere("order.status_id != :draftStatusId", {
			draftStatusId: ORDER_STATUS_IDS.DRAFT,
		});
	}

	const orders = await query.getMany();
	return orders.map(mapOrderToSummary);
}

export async function getDraftOrderForClientUser(userId: string) {
	const client = await getClientByUserId(userId);

	if (!client) {
		throw new OrderServiceError(
			"No existe ficha de cliente para este usuario",
			404,
			"ORDER_CLIENT_PROFILE_NOT_FOUND",
		);
	}

	return loadDraftOrderSummary(client.id, userId);
}

export async function getDraftOrderForCommercialUser(
	userId: string,
	input: {
		clientId?: string | null;
	} = {},
) {
	const clientId = String(input.clientId ?? "").trim();

	if (!clientId) {
		return null;
	}

	const commercial = await requireCommercialByUserId(userId);
	const canAccessClient = await canCommercialAccessClient(
		commercial.id,
		clientId,
	);

	if (!canAccessClient) {
		throw new OrderServiceError(
			"El cliente indicado no esta asignado a este comercial",
			403,
			"ORDER_CLIENT_NOT_ASSIGNED",
		);
	}

	return loadDraftOrderSummary(clientId, userId);
}

export async function listOrdersForClientUser(userId: string) {
	const client = await getClientByUserId(userId);

	if (!client) {
		throw new OrderServiceError(
			"No existe ficha de cliente para este usuario",
			404,
			"ORDER_CLIENT_PROFILE_NOT_FOUND",
		);
	}

	return listOrdersByClientId(client.id);
}

export async function listOrdersForCommercialUser(
	userId: string,
	input: ListOrdersForCommercialUserInput = {},
) {
	const commercial = await requireCommercialByUserId(userId);
	const ds = await getDataSource();
	const repo = ds.getRepository(Order);
	const query = createCommercialOrdersBaseQuery(repo, commercial.id)
		.orderBy("order.created_at", "DESC")
		.addOrderBy("lines.order_reference_snapshot", "ASC")
		.addOrderBy("product.name", "ASC");

	const clientId = String(input.clientId ?? "").trim();

	if (clientId) {
		query.andWhere("order.client_id = :clientId", { clientId });
	}

	const statusId = normalizeOptionalFilterId(input.statusId);

	if (statusId !== null) {
		query.andWhere("order.status_id = :statusId", { statusId });
	}

	const paymentStatusId = normalizeOptionalFilterId(input.paymentStatusId);

	if (paymentStatusId !== null) {
		query.andWhere("order.payment_status_id = :paymentStatusId", {
			paymentStatusId,
		});
	}

	if (input.pendingDeliveryOnly) {
		query
			.andWhere("order.status_id = :confirmedStatusId", {
				confirmedStatusId: ORDER_STATUS_IDS.CONFIRMED,
			})
			.andWhere(
				"(order.delivery_visit_id IS NULL OR deliveryVisit.status_id = :postponedVisitStatusId)",
				{
					postponedVisitStatusId: COMMERCIAL_VISIT_STATUS_IDS.POSTPONED,
				},
			);
	}

	const orders = await query.getMany();
	return orders.map(mapOrderToSummary);
}

export async function listOrdersForAdmin(
	input: ListOrdersForAdminInput = {},
) {
	const ds = await getDataSource();
	const repo = ds.getRepository(Order);
	const query = createOrdersBaseQuery(repo)
		.where("order.status_id != :draftStatusId", {
			draftStatusId: ORDER_STATUS_IDS.DRAFT,
		})
		.orderBy("order.created_at", "DESC")
		.addOrderBy("lines.order_reference_snapshot", "ASC")
		.addOrderBy("product.name", "ASC");
	const clientId = String(input.clientId ?? "").trim();

	if (clientId) {
		query.andWhere("order.client_id = :clientId", { clientId });
	}

	const statusId = normalizeOptionalFilterId(input.statusId);

	if (statusId !== null) {
		query.andWhere("order.status_id = :statusId", { statusId });
	}

	const paymentStatusId = normalizeOptionalFilterId(input.paymentStatusId);

	if (paymentStatusId !== null) {
		query.andWhere("order.payment_status_id = :paymentStatusId", {
			paymentStatusId,
		});
	}

	const orders = await query.getMany();
	return orders.map(mapOrderToSummary);
}

export async function getOrderDetailForClientUser(userId: string, orderId: string) {
	const client = await getClientByUserId(userId);

	if (!client) {
		throw new OrderServiceError(
			"No existe ficha de cliente para este usuario",
			404,
			"ORDER_CLIENT_PROFILE_NOT_FOUND",
		);
	}

	const order = await getRequiredOrderById(orderId);
	ensureManageableOrder(order);

	if (order.client_id !== client.id) {
		throw new OrderServiceError(
			"El pedido solicitado no existe",
			404,
			"ORDER_NOT_FOUND",
		);
	}

	return buildOrderDetail(order);
}

export async function getOrderDetailForCommercialUser(
	userId: string,
	orderId: string,
) {
	const commercial = await requireCommercialByUserId(userId);
	const order = await getRequiredOrderById(orderId);
	ensureManageableOrder(order);
	const canAccessClient = await canCommercialAccessClient(
		commercial.id,
		order.client_id,
	);

	if (!canAccessClient) {
		throw new OrderServiceError(
			"El cliente de este pedido no esta asignado a este comercial",
			403,
			"ORDER_CLIENT_NOT_ASSIGNED",
		);
	}

	return buildOrderDetail(order);
}

export async function getOrderDetailForAdmin(orderId: string) {
	const order = await getRequiredOrderById(orderId);
	ensureManageableOrder(order);
	return buildOrderDetail(order);
}

export async function updateOrderStatusForCommercialUser(
	userId: string,
	input: UpdateOrderManagementInput,
) {
	const commercial = await requireCommercialByUserId(userId);
	const order = await getRequiredOrderById(input.orderId);
	ensureManageableOrder(order);
	const canAccessClient = await canCommercialAccessClient(
		commercial.id,
		order.client_id,
	);

	if (!canAccessClient) {
		throw new OrderServiceError(
			"El cliente de este pedido no esta asignado a este comercial",
			403,
			"ORDER_CLIENT_NOT_ASSIGNED",
		);
	}

	return updateOrderManagementRecord(order, {
		actedByUserId: userId,
		paymentMethod: input.paymentMethod,
		paymentNotes: input.paymentNotes,
		paymentStatusId: input.paymentStatusId,
		statusId: input.statusId,
	});
}

export async function registerOrderPaymentForCommercialUser(
	userId: string,
	input: Omit<RegisterOrderPaymentInput, "actedByUserId">,
) {
	const commercial = await requireCommercialByUserId(userId);
	const order = await getRequiredOrderById(input.orderId);
	ensureManageableOrder(order);
	const canAccessClient = await canCommercialAccessClient(
		commercial.id,
		order.client_id,
	);

	if (!canAccessClient) {
		throw new OrderServiceError(
			"El cliente de este pedido no esta asignado a este comercial",
			403,
			"ORDER_CLIENT_NOT_ASSIGNED",
		);
	}

	return registerOrderPaymentRecord(order, {
		actedByUserId: userId,
		amount: input.amount,
		paymentMethod: input.paymentMethod,
		paymentNotes: input.paymentNotes,
	});
}

export async function updateOrderStatusForAdmin(input: UpdateOrderManagementInput) {
	const order = await getRequiredOrderById(input.orderId);
	ensureManageableOrder(order);
	return updateOrderManagementRecord(order, {
		actedByUserId: input.actedByUserId,
		paymentMethod: input.paymentMethod,
		paymentNotes: input.paymentNotes,
		paymentStatusId: input.paymentStatusId,
		statusId: input.statusId,
	});
}

export async function registerOrderPaymentForAdmin(
	input: RegisterOrderPaymentInput,
) {
	const order = await getRequiredOrderById(input.orderId);
	ensureManageableOrder(order);

	return registerOrderPaymentRecord(order, {
		actedByUserId: input.actedByUserId,
		amount: input.amount,
		paymentMethod: input.paymentMethod,
		paymentNotes: input.paymentNotes,
	});
}

export async function saveDraftForClientUser(
	userId: string,
	input: Omit<SaveDraftInput, "clientId" | "createdByUserId">,
) {
	const client = await getClientByUserId(userId);

	if (!client) {
		throw new OrderServiceError(
			"No existe ficha de cliente para este usuario",
			404,
			"ORDER_CLIENT_PROFILE_NOT_FOUND",
		);
	}

	return saveDraftRecord({
		clientId: client.id,
		createdByUserId: userId,
		fulfillmentMethod: input.fulfillmentMethod,
		notes: input.notes,
		lines: input.lines,
	});
}

export async function saveDraftForCommercialUser(
	userId: string,
	input: Omit<SaveDraftInput, "createdByUserId">,
) {
	const commercial = await requireCommercialByUserId(userId);
	const canAccessClient = await canCommercialAccessClient(
		commercial.id,
		input.clientId,
	);

	if (!canAccessClient) {
		throw new OrderServiceError(
			"El cliente indicado no esta asignado a este comercial",
			403,
			"ORDER_CLIENT_NOT_ASSIGNED",
		);
	}

	return saveDraftRecord({
		clientId: input.clientId,
		createdByUserId: userId,
		fulfillmentMethod: input.fulfillmentMethod,
		notes: input.notes,
		lines: input.lines,
	});
}

export async function clearDraftForClientUser(userId: string) {
	const client = await getClientByUserId(userId);

	if (!client) {
		throw new OrderServiceError(
			"No existe ficha de cliente para este usuario",
			404,
			"ORDER_CLIENT_PROFILE_NOT_FOUND",
		);
	}

	return saveDraftRecord({
		clientId: client.id,
		createdByUserId: userId,
		lines: [],
	});
}

export async function clearDraftForCommercialUser(
	userId: string,
	input: {
		clientId: string;
	},
) {
	const commercial = await requireCommercialByUserId(userId);
	const canAccessClient = await canCommercialAccessClient(
		commercial.id,
		input.clientId,
	);

	if (!canAccessClient) {
		throw new OrderServiceError(
			"El cliente indicado no esta asignado a este comercial",
			403,
			"ORDER_CLIENT_NOT_ASSIGNED",
		);
	}

	return saveDraftRecord({
		clientId: input.clientId,
		createdByUserId: userId,
		lines: [],
	});
}

export async function addLineToDraftForClientUser(
	userId: string,
	input: Omit<AddDraftOrderLineInput, "clientId" | "createdByUserId">,
) {
	const client = await getClientByUserId(userId);

	if (!client) {
		throw new OrderServiceError(
			"No existe ficha de cliente para este usuario",
			404,
			"ORDER_CLIENT_PROFILE_NOT_FOUND",
		);
	}

	return addLineToDraftRecord({
		clientId: client.id,
		createdByUserId: userId,
		productId: input.productId,
		colorReferenceId: input.colorReferenceId ?? null,
		quantity: input.quantity ?? 1,
	});
}

export async function addLineToDraftForCommercialUser(
	userId: string,
	input: Omit<AddDraftOrderLineInput, "createdByUserId">,
) {
	const commercial = await requireCommercialByUserId(userId);
	const canAccessClient = await canCommercialAccessClient(
		commercial.id,
		input.clientId,
	);

	if (!canAccessClient) {
		throw new OrderServiceError(
			"El cliente indicado no esta asignado a este comercial",
			403,
			"ORDER_CLIENT_NOT_ASSIGNED",
		);
	}

	return addLineToDraftRecord({
		clientId: input.clientId,
		createdByUserId: userId,
		productId: input.productId,
		colorReferenceId: input.colorReferenceId ?? null,
		quantity: input.quantity ?? 1,
	});
}

export async function createOrderForClientUser(
	userId: string,
	input: Omit<CreateOrderInput, "clientId" | "createdByUserId">,
) {
	const client = await getClientByUserId(userId);

	if (!client) {
		throw new OrderServiceError(
			"No existe ficha de cliente para este usuario",
			404,
			"ORDER_CLIENT_PROFILE_NOT_FOUND",
		);
	}

	return submitOrderRecord({
		clientId: client.id,
		createdByUserId: userId,
		fulfillmentMethod: input.fulfillmentMethod,
		notes: input.notes,
		lines: input.lines,
	});
}

export async function createOrderForCommercialUser(
	userId: string,
	input: Omit<CreateOrderInput, "createdByUserId">,
) {
	const commercial = await requireCommercialByUserId(userId);
	const canAccessClient = await canCommercialAccessClient(
		commercial.id,
		input.clientId,
	);

	if (!canAccessClient) {
		throw new OrderServiceError(
			"El cliente indicado no esta asignado a este comercial",
			403,
			"ORDER_CLIENT_NOT_ASSIGNED",
		);
	}

	return submitOrderRecord({
		clientId: input.clientId,
		createdByUserId: userId,
		fulfillmentMethod: input.fulfillmentMethod,
		notes: input.notes,
		lines: input.lines,
	});
}
