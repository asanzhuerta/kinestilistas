import type {
	CreateOrderLineBody,
	OrderProductOption,
	OrderSummary,
	OrderSummaryLine,
} from "@/lib/contracts/order";
import { getVisibleProductReference, isSyntheticProductReference } from "@/lib/catalog/product-reference";
import { normalizeText } from "@/lib/utils/text";
import { getDataSource } from "@/lib/typeorm/data-source";
import {
	ORDER_STATUS_IDS,
	PRODUCT_STATUS_IDS,
} from "@/lib/typeorm/constants/catalog-ids";
import { Product } from "@/lib/typeorm/entities/Product";
import { Client } from "@/lib/typeorm/entities/Client";
import { User } from "@/lib/typeorm/entities/User";
import { Order } from "@/lib/typeorm/entities/Order";
import { OrderLine } from "@/lib/typeorm/entities/OrderLine";
import { ColorReference } from "@/lib/typeorm/entities/ColorReference";
import { ClientCommercialAssignment } from "@/lib/typeorm/entities/ClientCommercialAssignment";
import { getClientByUserId } from "@/lib/typeorm/services/commercial/client";
import {
	canCommercialAccessClient,
} from "@/lib/typeorm/services/commercial/client-commercial-assignment";
import { requireCommercialByUserId } from "@/lib/typeorm/services/commercial/commercial";
import { listColorReferences } from "@/lib/typeorm/services/catalog/color-chart";
import { listProducts } from "@/lib/typeorm/services/catalog/product";
import type { Repository } from "typeorm";

type CreateOrderInput = {
	clientId: string;
	createdByUserId: string;
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
	notes?: string | null;
	lines?: CreateOrderLineBody[];
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
			"Importe de producto no valido",
			500,
			"INVALID_PRODUCT_PRICE",
		);
	}

	return Math.round(parsed * 100);
}

function formatCents(cents: number) {
	return (cents / 100).toFixed(2);
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
				"Cada linea del pedido debe indicar un producto",
				400,
				"ORDER_LINE_PRODUCT_REQUIRED",
			);
		}

		if (!Number.isInteger(quantity) || quantity <= 0) {
			throw new OrderServiceError(
				"La cantidad de cada linea debe ser un entero positivo",
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

	return {
		id: order.id,
		client_id: order.client_id,
		client_name: order.client?.name ?? "Cliente",
		client_contact_name: order.client?.contact_name ?? null,
		created_by_user_id: order.created_by_user_id,
		created_by_user_name: order.createdByUser?.name ?? "Usuario",
		status_id: order.status_id,
		status_code: order.status?.code ?? "",
		status_name: order.status?.name ?? "Sin estado",
		total_amount: String(order.total_amount ?? "0.00"),
		notes: order.notes ?? null,
		created_at: toIsoString(order.created_at),
		updated_at: toIsoString(order.updated_at),
		line_count: sortedLines.length,
		lines: sortedLines.map(buildOrderSummaryLine),
	};
}

function createOrdersBaseQuery(repo: Repository<Order>) {
	return repo
		.createQueryBuilder("order")
		.leftJoinAndSelect("order.client", "client")
		.leftJoinAndSelect("order.createdByUser", "createdByUser")
		.leftJoinAndSelect("order.status", "status")
		.leftJoinAndSelect("order.lines", "lines")
		.leftJoinAndSelect("lines.product", "product")
		.leftJoinAndSelect("lines.colorReference", "colorReference")
		.leftJoinAndSelect("product.productLine", "productLine");
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

	const [client, createdByUser] = await Promise.all([
		clientRepo.findOne({
			where: { id: input.clientId },
		}),
		userRepo.findOne({
			where: { id: input.createdByUserId },
		}),
	]);

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

async function prepareOrderLineRecords(
	manager: Awaited<ReturnType<typeof getDataSource>>["manager"],
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

	const [products, colorReferences, productVariantCounts] = await Promise.all([
		productRepo
			.createQueryBuilder("product")
			.leftJoinAndSelect("product.productLine", "productLine")
			.where("product.id IN (:...productIds)", { productIds })
			.andWhere("product.status_id = :statusId", {
				statusId: PRODUCT_STATUS_IDS.ACTIVE,
			})
			.getMany(),
		colorReferenceIds.length > 0
			? colorReferenceRepo
					.createQueryBuilder("colorReference")
					.where("colorReference.id IN (:...colorReferenceIds)", {
						colorReferenceIds,
					})
					.andWhere("colorReference.is_orderable = true")
					.getMany()
			: Promise.resolve([] as ColorReference[]),
		colorReferenceRepo
			.createQueryBuilder("colorReference")
			.select("colorReference.product_id", "productId")
			.addSelect("COUNT(*)", "count")
			.where("colorReference.product_id IN (:...productIds)", { productIds })
			.andWhere("colorReference.is_orderable = true")
			.groupBy("colorReference.product_id")
			.getRawMany<{ productId: string; count: string }>(),
	]);

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
				"Debes indicar el tono o referencia exacta para este producto de coloracion",
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
		const lineTotalCents = unitPriceCents * line.quantity;
		totalAmountCents += lineTotalCents;

		return {
			productId: product.id,
			colorReferenceId: selectedColorReference?.id ?? null,
			quantity: line.quantity,
			unitPriceSnapshot: formatCents(unitPriceCents),
			discountPercentage: "0.00",
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
		input.lines,
	);

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
			total_amount: formatCents(totalAmountCents),
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

async function loadDraftOrderSummary(
	clientId: string,
	createdByUserId: string,
) {
	const ds = await getDataSource();
	const repo = ds.getRepository(Order);
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

	return draftOrder ? mapOrderToSummary(draftOrder) : null;
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
		notes: currentDraft?.notes ?? null,
		lines: nextLines,
	});
}

async function submitOrderRecord(input: CreateOrderInput) {
	const ds = await getDataSource();
	const normalizedLines = normalizeRequestedOrderLines(input.lines);

	const createdOrderId = await ds.transaction(async (manager) => {
		const existingDraftId = await findDraftOrderId(
			manager,
			input.clientId,
			input.createdByUserId,
		);

		return persistOrderRecord(manager, {
			existingOrderId: existingDraftId,
			clientId: input.clientId,
			createdByUserId: input.createdByUserId,
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

export async function listOrderProductOptions(): Promise<OrderProductOption[]> {
	const [products, orderableColorReferences] = await Promise.all([
		listProducts({
			statusId: PRODUCT_STATUS_IDS.ACTIVE,
		}),
		listColorReferences({
			orderableOnly: true,
		}),
	]);

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
					format: product.format ?? null,
					packing: product.packing ?? null,
				});
			}

			continue;
		}

		if (isSyntheticProductReference(product.reference)) {
			continue;
		}

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
	input: {
		clientId?: string | null;
	} = {},
) {
	const commercial = await requireCommercialByUserId(userId);
	const ds = await getDataSource();
	const repo = ds.getRepository(Order);
	const query = createOrdersBaseQuery(repo)
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
		.andWhere("order.status_id != :draftStatusId", {
			draftStatusId: ORDER_STATUS_IDS.DRAFT,
		})
		.orderBy("order.created_at", "DESC")
		.addOrderBy("lines.order_reference_snapshot", "ASC")
		.addOrderBy("product.name", "ASC");

	const clientId = String(input.clientId ?? "").trim();

	if (clientId) {
		query.andWhere("order.client_id = :clientId", { clientId });
	}

	const orders = await query.getMany();
	return orders.map(mapOrderToSummary);
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
		notes: input.notes,
		lines: input.lines,
	});
}
