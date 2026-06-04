import {
	ORDER_PAYMENT_STATUS_IDS,
	ORDER_STATUS_IDS,
	PRODUCT_STATUS_IDS,
	ROLE_IDS,
	USER_STATUS_IDS,
} from "@/lib/typeorm/constants/catalog-ids";
import { getDataSource } from "@/lib/typeorm/data-source";
import { AppNotification } from "@/lib/typeorm/entities/AppNotification";
import { ClientCommercialAssignment } from "@/lib/typeorm/entities/ClientCommercialAssignment";
import { ColorReference } from "@/lib/typeorm/entities/ColorReference";
import { Order } from "@/lib/typeorm/entities/Order";
import { Product } from "@/lib/typeorm/entities/Product";
import { Promotion } from "@/lib/typeorm/entities/Promotion";
import {
	createPromotion,
	deletePromotion,
} from "@/lib/typeorm/services/communications/communications";
import {
	createOrderForCommercialUser,
	saveDraftForCommercialUser,
} from "@/lib/typeorm/services/orders/order";

type CandidateContext = {
	clientId: string;
	clientName: string;
	commercialUserId: string;
	commercialName: string;
};

type ProductContext = {
	product: Product;
	colorReferenceId: string | null;
};

const DISCOUNT_PERCENTAGE = 15;
const ORDER_QUANTITY = 2;

function assertCondition(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

function toDateOnly(date: Date) {
	return date.toISOString().slice(0, 10);
}

function formatCents(cents: number) {
	return (cents / 100).toFixed(2);
}

function calculateExpectedLineTotal(product: Product) {
	const unitPriceCents = Math.round(Number(product.base_price) * 100);
	const subtotalCents = unitPriceCents * ORDER_QUANTITY;
	const basisPoints = DISCOUNT_PERCENTAGE * 100;
	const discountedCents = Math.round(
		(subtotalCents * (10000 - basisPoints)) / 10000,
	);

	return {
		unitPrice: formatCents(unitPriceCents),
		lineTotal: formatCents(discountedCents),
		orderTotal: formatCents(discountedCents),
	};
}

async function countOpenUnpaidOrders(clientId: string) {
	const ds = await getDataSource();

	return ds
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

async function hasDraftForCommercialClient(
	clientId: string,
	commercialUserId: string,
) {
	const ds = await getDataSource();
	const draftCount = await ds.getRepository(Order).count({
		where: {
			client_id: clientId,
			created_by_user_id: commercialUserId,
			status_id: ORDER_STATUS_IDS.DRAFT,
		},
	});

	return draftCount > 0;
}

async function findCandidateContext(): Promise<CandidateContext> {
	const ds = await getDataSource();
	const assignments = await ds
		.getRepository(ClientCommercialAssignment)
		.createQueryBuilder("assignment")
		.leftJoinAndSelect("assignment.client", "client")
		.leftJoinAndSelect("client.user", "clientUser")
		.leftJoinAndSelect("assignment.commercial", "commercial")
		.leftJoinAndSelect("commercial.user", "commercialUser")
		.where("assignment.unassigned_at IS NULL")
		.andWhere("clientUser.role_id = :clientRoleId", {
			clientRoleId: ROLE_IDS.CLIENT,
		})
		.andWhere("clientUser.status_id = :activeStatusId", {
			activeStatusId: USER_STATUS_IDS.ACTIVE,
		})
		.andWhere("commercialUser.role_id = :commercialRoleId", {
			commercialRoleId: ROLE_IDS.COMMERCIAL,
		})
		.andWhere("commercialUser.status_id = :activeStatusId", {
			activeStatusId: USER_STATUS_IDS.ACTIVE,
		})
		.orderBy("assignment.assigned_at", "DESC")
		.getMany();

	for (const assignment of assignments) {
		const clientId = assignment.client?.id ?? "";
		const commercialUserId = assignment.commercial?.id ?? "";

		if (!clientId || !commercialUserId) {
			continue;
		}

		const [openUnpaidOrders, hasDraft] = await Promise.all([
			countOpenUnpaidOrders(clientId),
			hasDraftForCommercialClient(clientId, commercialUserId),
		]);

		if (openUnpaidOrders >= 2 || hasDraft) {
			continue;
		}

		return {
			clientId,
			clientName: assignment.client?.name ?? "Cliente",
			commercialUserId,
			commercialName: assignment.commercial?.user?.name ?? "Comercial",
		};
	}

	throw new Error(
		"No se ha encontrado un cliente asignado con margen para un pedido temporal y sin borrador comercial para ejecutar el cierre de descuentos de M6",
	);
}

async function findOrderableProduct(): Promise<ProductContext> {
	const ds = await getDataSource();
	const products = await ds
		.getRepository(Product)
		.createQueryBuilder("product")
		.leftJoinAndSelect(
			"product.colorReferences",
			"colorReference",
			"colorReference.is_orderable = true",
		)
		.where("product.status_id = :statusId", {
			statusId: PRODUCT_STATUS_IDS.ACTIVE,
		})
		.andWhere("product.base_price > 0")
		.orderBy("product.created_at", "DESC")
		.addOrderBy("colorReference.display_order", "ASC")
		.getMany();

	for (const product of products) {
		const colorReferences = (product.colorReferences ?? []) as ColorReference[];

		return {
			product,
			colorReferenceId: colorReferences[0]?.id ?? null,
		};
	}

	throw new Error(
		"No hay productos activos pedibles para ejecutar el cierre de descuentos de M6",
	);
}

async function deleteNotificationsBySourceId(sourceId: string | null) {
	if (!sourceId) {
		return;
	}

	const ds = await getDataSource();
	await ds.getRepository(AppNotification).delete({
		source_type: "promotion",
		source_id: sourceId,
	});
}

async function main() {
	const ds = await getDataSource();
	const candidate = await findCandidateContext();
	const productContext = await findOrderableProduct();
	const now = Date.now();
	const tag = `m6-discount-smoke-${now}`;
	const today = new Date();
	const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
	const expected = calculateExpectedLineTotal(productContext.product);
	const created = {
		promotionId: null as string | null,
		orderId: null as string | null,
		draftId: null as string | null,
	};

	try {
		const promotion = await createPromotion({
			title: `Promocion ${tag}`,
			description: "Promocion temporal para validar descuentos de pedido en M6",
			promotionType: "descuento",
			benefit: `${DISCOUNT_PERCENTAGE} % sobre producto`,
			startDate: toDateOnly(today),
			endDate: toDateOnly(tomorrow),
			status: "active",
			productId: productContext.product.id,
			clientId: candidate.clientId,
			createdByUserId: null,
		});

		assertCondition(promotion?.id, "No se ha creado la promocion temporal");
		created.promotionId = promotion.id;
		console.log(
			`PASS promocion temporal creada (${candidate.clientName}, ${productContext.product.name})`,
		);

		const draft = await saveDraftForCommercialUser(candidate.commercialUserId, {
			clientId: candidate.clientId,
			notes: tag,
			lines: [
				{
					productId: productContext.product.id,
					colorReferenceId: productContext.colorReferenceId,
					quantity: ORDER_QUANTITY,
				},
			],
		});

		assertCondition(draft?.id, "No se ha creado el borrador temporal");
		created.draftId = draft.id;
		const draftLine = draft.lines[0];
		assertCondition(draftLine, "El borrador no contiene lineas");
		assertCondition(
			draftLine.discount_percentage === `${DISCOUNT_PERCENTAGE}.00`,
			"El borrador no conserva el porcentaje de descuento esperado",
		);
		assertCondition(
			draftLine.unit_price_snapshot === expected.unitPrice,
			"El borrador no conserva el precio unitario esperado",
		);
		assertCondition(
			draftLine.line_total === expected.lineTotal,
			"El borrador no aplica el total de linea descontado esperado",
		);
		assertCondition(
			draft.total_amount === expected.orderTotal,
			"El borrador no recalcula el total con descuento",
		);
		console.log("PASS borrador comercial con descuento promocional aplicado");

		const order = await createOrderForCommercialUser(candidate.commercialUserId, {
			clientId: candidate.clientId,
			notes: tag,
			lines: [
				{
					productId: productContext.product.id,
					colorReferenceId: productContext.colorReferenceId,
					quantity: ORDER_QUANTITY,
				},
			],
		});

		assertCondition(order?.id, "No se ha creado el pedido temporal");
		created.orderId = order.id;
		const orderLine = order.lines[0];
		assertCondition(orderLine, "El pedido no contiene lineas");
		assertCondition(
			order.status_code === "created",
			"El pedido final no queda en estado created",
		);
		assertCondition(
			orderLine.discount_percentage === `${DISCOUNT_PERCENTAGE}.00`,
			"El pedido final no conserva el porcentaje de descuento esperado",
		);
		assertCondition(
			orderLine.line_total === expected.lineTotal,
			"El pedido final no aplica el total de linea descontado esperado",
		);
		assertCondition(
			order.total_amount === expected.orderTotal,
			"El pedido final no recalcula el total con descuento",
		);
		console.log(
			`PASS pedido final con descuento promocional aplicado (${candidate.commercialName})`,
		);
	} finally {
		const orderIds = Array.from(
			new Set([created.orderId, created.draftId].filter(Boolean) as string[]),
		);

		if (orderIds.length > 0) {
			await ds.getRepository(Order).delete(orderIds);
		}

		if (created.promotionId) {
			await deletePromotion(created.promotionId);
			await deleteNotificationsBySourceId(created.promotionId);
		}
	}

	const leftovers = await Promise.all([
		ds.getRepository(Order).count({ where: { notes: tag } }),
		ds.getRepository(Promotion).count({
			where: { title: `Promocion ${tag}` },
		}),
	]);

	assertCondition(
		leftovers.every((count) => count === 0),
		"La limpieza final del cierre de descuentos de M6 ha dejado registros temporales",
	);
	console.log("PASS limpieza final completada");
}

void main()
	.then(() => {
		console.log("M6 promotion discount smoke OK");
	})
	.catch((error) => {
		console.error("M6 promotion discount smoke FAILED");
		console.error(error);
		process.exitCode = 1;
	});
