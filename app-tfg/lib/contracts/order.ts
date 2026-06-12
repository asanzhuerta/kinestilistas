export type OrderStatusCode =
	| "draft"
	| "created"
	| "confirmed"
	| "delivered"
	| "cancelled";

export type OrderPaymentStatusCode = "pending" | "paid";

export type OrderPaymentMethodCode =
	| "cash"
	| "card"
	| "transfer"
	| "other";

export type OrderFulfillmentMethod = "commercial" | "agency";

export type OrderDeliveryStatusCode =
	| "prepared"
	| "planned"
	| "delivered"
	| "cancelled";

export type OrderProductOption = {
	id: string;
	productId: string;
	colorReferenceId: string | null;
	name: string;
	reference: string | null;
	orderReference: string;
	colorReferenceCode: string | null;
	colorReferenceName: string | null;
	isColorReference: boolean;
	productCategoryName: string | null;
	productLineName: string | null;
	imageUrl: string | null;
	basePrice: string;
	discountPercentage: string;
	discountTitle: string | null;
	discountBenefit: string | null;
	format: string | null;
	packing: number | null;
};

export type OrderSummaryLine = {
	id: string;
	product_id: string;
	color_reference_id: string | null;
	product_name: string;
	product_reference: string | null;
	order_reference: string;
	color_reference_code: string | null;
	color_reference_name: string | null;
	product_line_name: string | null;
	quantity: number;
	unit_price_snapshot: string;
	discount_percentage: string;
	line_total: string;
};

export type OrderDeliveryLineSummary = {
	id: string;
	delivery_id: string;
	order_line_id: string;
	quantity: number;
	product_name: string;
	product_reference: string | null;
	order_reference: string;
	color_reference_code: string | null;
	color_reference_name: string | null;
	product_line_name: string | null;
};

export type OrderDeliverySummary = {
	id: string;
	order_id: string;
	order_short_id: string;
	fulfillment_method: OrderFulfillmentMethod | string;
	client_id: string;
	client_name: string;
	client_contact_name: string | null;
	client_email: string | null;
	client_phone: string | null;
	client_address: string | null;
	client_city: string | null;
	client_postal_code: string | null;
	client_province: string | null;
	commercial_id: string;
	commercial_name: string | null;
	commercial_email: string | null;
	commercial_phone: string | null;
	commercial_address: string | null;
	commercial_territory: string | null;
	delivery_visit_id: string | null;
	delivery_visit_scheduled_for_date: string | null;
	delivery_visit_status_id: number | null;
	delivery_visit_status_name: string | null;
	status: OrderDeliveryStatusCode | string;
	status_name: string;
	package_count: number;
	notes: string | null;
	delivered_at: string | null;
	created_at: string;
	updated_at: string;
	line_count: number;
	lines: OrderDeliveryLineSummary[];
};

export type PendingOrderDeliveryLine = OrderSummaryLine & {
	prepared_quantity: number;
	delivered_quantity: number;
	remaining_quantity: number;
};

export type PendingOrderDeliveryPreparation = Omit<
	OrderSummary,
	"lines" | "deliveries"
> & {
	lines: PendingOrderDeliveryLine[];
	remaining_line_count: number;
};

export type OrderPaymentSummary = {
	id: string;
	order_id: string;
	amount: string;
	payment_method: OrderPaymentMethodCode | string;
	notes: string | null;
	paid_at: string;
	registered_by_user_id: string | null;
	registered_by_user_name: string | null;
	created_at: string;
};

export type OrderSummary = {
	id: string;
	client_id: string;
	client_name: string;
	client_contact_name: string | null;
	fulfillment_method: OrderFulfillmentMethod | string;
	agency_delivery_fee: string;
	created_by_user_id: string;
	created_by_user_name: string;
	created_by_user_role_id: number | null;
	status_id: number;
	status_code: OrderStatusCode | string;
	status_name: string;
	total_amount: string;
	paid_amount: string;
	pending_amount: string;
	notes: string | null;
	payment_status_id: number;
	payment_status_code: OrderPaymentStatusCode | string;
	payment_status_name: string;
	payment_method: OrderPaymentMethodCode | string | null;
	payment_notes: string | null;
	paid_at: string | null;
	paid_by_user_id: string | null;
	paid_by_user_name: string | null;
	created_at: string;
	updated_at: string;
	delivery_visit_id: string | null;
	delivery_visit_scheduled_for_date: string | null;
	delivery_visit_status_id: number | null;
	delivery_visit_status_name: string | null;
	line_count: number;
	lines: OrderSummaryLine[];
	payments: OrderPaymentSummary[];
	deliveries: OrderDeliverySummary[];
};

export type OrderStatusOption = {
	id: number;
	code: OrderStatusCode | string;
	name: string;
};

export type OrderPaymentStatusOption = {
	id: number;
	code: OrderPaymentStatusCode | string;
	name: string;
};

export type OrderDetail = {
	order: OrderSummary;
	availableStatusTransitions: OrderStatusOption[];
	availablePaymentTransitions: OrderPaymentStatusOption[];
};

export type CreateOrderLineBody = {
	productId?: string;
	colorReferenceId?: string | null;
	quantity?: number | string | null;
};

export type CreateClientOrderBody = {
	fulfillmentMethod?: OrderFulfillmentMethod | string | null;
	notes?: string | null;
	lines?: CreateOrderLineBody[];
};

export type CreateCommercialOrderBody = {
	clientId?: string;
	fulfillmentMethod?: OrderFulfillmentMethod | string | null;
	notes?: string | null;
	lines?: CreateOrderLineBody[];
};

export type SaveClientOrderDraftBody = {
	fulfillmentMethod?: OrderFulfillmentMethod | string | null;
	notes?: string | null;
	lines?: CreateOrderLineBody[];
};

export type SaveCommercialOrderDraftBody = {
	clientId?: string;
	fulfillmentMethod?: OrderFulfillmentMethod | string | null;
	notes?: string | null;
	lines?: CreateOrderLineBody[];
};

export type AddClientDraftOrderLineBody = {
	productId?: string;
	colorReferenceId?: string | null;
	quantity?: number | string | null;
};

export type AddCommercialDraftOrderLineBody = {
	clientId?: string;
	productId?: string;
	colorReferenceId?: string | null;
	quantity?: number | string | null;
};

export type UpdateOrderStatusBody = {
	statusId?: number | string | null;
	paymentStatusId?: number | string | null;
	paymentMethod?: string | null;
	paymentNotes?: string | null;
};

export type RegisterOrderPaymentBody = {
	amount?: number | string | null;
	paymentMethod?: string | null;
	paymentNotes?: string | null;
};

export type PrepareOrderDeliveryLineBody = {
	orderLineId?: string;
	quantity?: number | string | null;
};

export type PrepareOrderDeliveryBody = {
	orderId?: string;
	packageCount?: number | string | null;
	notes?: string | null;
	lines?: PrepareOrderDeliveryLineBody[];
};

export function buildCreateClientOrderInput(body: CreateClientOrderBody) {
	return {
		fulfillmentMethod: body.fulfillmentMethod,
		notes: body.notes,
		lines: body.lines,
	};
}

export function buildCreateCommercialOrderInput(body: CreateCommercialOrderBody) {
	return {
		clientId: body.clientId,
		fulfillmentMethod: body.fulfillmentMethod,
		notes: body.notes,
		lines: body.lines,
	};
}

export function buildSaveClientOrderDraftInput(body: SaveClientOrderDraftBody) {
	return {
		fulfillmentMethod: body.fulfillmentMethod,
		notes: body.notes,
		lines: body.lines,
	};
}

export function buildSaveCommercialOrderDraftInput(
	body: SaveCommercialOrderDraftBody,
) {
	return {
		clientId: body.clientId,
		fulfillmentMethod: body.fulfillmentMethod,
		notes: body.notes,
		lines: body.lines,
	};
}

export function buildAddClientDraftOrderLineInput(
	body: AddClientDraftOrderLineBody,
) {
	return {
		productId: body.productId,
		colorReferenceId: body.colorReferenceId,
		quantity: body.quantity,
	};
}

export function buildAddCommercialDraftOrderLineInput(
	body: AddCommercialDraftOrderLineBody,
) {
	return {
		clientId: body.clientId,
		productId: body.productId,
		colorReferenceId: body.colorReferenceId,
		quantity: body.quantity,
	};
}

export function buildUpdateOrderStatusInput(body: UpdateOrderStatusBody) {
	return {
		statusId: body.statusId,
		paymentStatusId: body.paymentStatusId,
		paymentMethod: body.paymentMethod,
		paymentNotes: body.paymentNotes,
	};
}

export function buildRegisterOrderPaymentInput(body: RegisterOrderPaymentBody) {
	return {
		amount: body.amount,
		paymentMethod: body.paymentMethod,
		paymentNotes: body.paymentNotes,
	};
}

export function buildPrepareOrderDeliveryInput(body: PrepareOrderDeliveryBody) {
	return {
		orderId: body.orderId,
		packageCount: body.packageCount,
		notes: body.notes,
		lines: body.lines,
	};
}
