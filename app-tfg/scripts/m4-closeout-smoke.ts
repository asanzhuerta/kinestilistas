import { getClientDeliveryEstimate } from "@/lib/clients/delivery-estimate";
import { getTodayRangeInMadrid } from "@/lib/commercial/daily-route-planning";
import {
	COMMERCIAL_VISIT_STATUS_IDS,
	COMMERCIAL_VISIT_TYPE_IDS,
	ORDER_STATUS_IDS,
} from "@/lib/typeorm/constants/catalog-ids";
import { getDataSource } from "@/lib/typeorm/data-source";
import { ClientCommercialAssignment } from "@/lib/typeorm/entities/ClientCommercialAssignment";
import { CommercialVisit } from "@/lib/typeorm/entities/CommercialVisit";
import { Order } from "@/lib/typeorm/entities/Order";
import {
	createCommercialVisit,
	updateCommercialVisit,
} from "@/lib/typeorm/services/commercial/commercial-visit";
import {
	createOrderForCommercialUser,
	getOrderDetailForCommercialUser,
	listOrdersByClientId,
	updateOrderStatusForCommercialUser,
} from "@/lib/typeorm/services/orders/order";

type CandidateContext = {
	clientId: string;
	clientName: string;
	commercialUserId: string;
	commercialName: string;
};

function assertCondition(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

async function expectFailure(
	label: string,
	callback: () => Promise<unknown>,
	validator: (error: unknown) => boolean,
	message: string,
) {
	try {
		await callback();
		throw new Error(message);
	} catch (error) {
		if (!validator(error)) {
			throw error;
		}

		console.log(`PASS ${label}`);
	}
}

async function findCandidateContext(): Promise<CandidateContext> {
	const ds = await getDataSource();
	const repo = ds.getRepository(ClientCommercialAssignment);
	const assignments = await repo
		.createQueryBuilder("assignment")
		.leftJoinAndSelect("assignment.client", "client")
		.leftJoinAndSelect("assignment.commercial", "commercial")
		.leftJoinAndSelect("commercial.user", "commercialUser")
		.where("assignment.unassigned_at IS NULL")
		.orderBy("assignment.assigned_at", "DESC")
		.getMany();

	for (const assignment of assignments) {
		const clientId = assignment.client?.id ?? "";
		const commercialUserId = assignment.commercial?.id ?? "";
		const clientLat = assignment.client?.lat;
		const clientLng = assignment.client?.lng;

		if (!clientId || !commercialUserId || !clientLat || !clientLng) {
			continue;
		}

		const existingOrders = await listOrdersByClientId(clientId);
		const openUnpaidCount = existingOrders.filter(
			(order) =>
				order.status_code !== "cancelled" &&
				order.payment_status_code !== "paid",
		).length;

		if (openUnpaidCount > 0) {
			continue;
		}

		const baselineEstimate = await getClientDeliveryEstimate(clientId);

		if (baselineEstimate.status !== "no_delivery_today") {
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
		"No se ha encontrado un cliente asignado con coordenadas y sin reparto activo para ejecutar la prueba de cierre de M4",
	);
}

async function findAnotherAssignedClient(
	commercialUserId: string,
	excludedClientId: string,
) {
	const ds = await getDataSource();
	const repo = ds.getRepository(ClientCommercialAssignment);
	const assignments = await repo
		.createQueryBuilder("assignment")
		.leftJoinAndSelect("assignment.client", "client")
		.where("assignment.commercial_id = :commercialId", {
			commercialId: commercialUserId,
		})
		.andWhere("assignment.client_id != :excludedClientId", {
			excludedClientId,
		})
		.andWhere("assignment.unassigned_at IS NULL")
		.orderBy("assignment.assigned_at", "DESC")
		.getMany();

	for (const assignment of assignments) {
		const clientId = assignment.client?.id ?? "";

		if (!clientId) {
			continue;
		}

		const existingOrders = await listOrdersByClientId(clientId);
		const openUnpaidCount = existingOrders.filter(
			(order) =>
				order.status_code !== "cancelled" &&
				order.payment_status_code !== "paid",
		).length;

		if (openUnpaidCount > 0) {
			continue;
		}

		return {
			clientId,
			clientName: assignment.client?.name ?? "Cliente alternativo",
		};
	}

	throw new Error(
		"No se ha encontrado un segundo cliente asignado sin pedidos abiertos para completar la prueba de cierre de M4",
	);
}

async function loadTemplateLines() {
	const ds = await getDataSource();
	const order = await ds
		.getRepository(Order)
		.createQueryBuilder("order")
		.leftJoinAndSelect("order.lines", "lines")
		.where("order.status_id != :draftStatusId", {
			draftStatusId: ORDER_STATUS_IDS.DRAFT,
		})
		.orderBy("order.created_at", "DESC")
		.getOne();

	assertCondition(
		order && Array.isArray(order.lines) && order.lines.length > 0,
		"No hay un pedido base con líneas para reutilizar en la prueba de cierre de M4",
	);

	return order.lines.map((line) => ({
		productId: line.product_id,
		colorReferenceId: line.color_reference_id ?? null,
		quantity: Number(line.quantity ?? 0),
	}));
}

async function cleanupTemporaryData(orderIds: string[], visitIds: string[]) {
	const ds = await getDataSource();

	if (orderIds.length > 0) {
		await ds.getRepository(Order).delete(orderIds);
	}

	if (visitIds.length > 0) {
		await ds.getRepository(CommercialVisit).delete(visitIds);
	}
}

async function main() {
	const createdOrderIds: string[] = [];
	const createdVisitIds: string[] = [];
	const { dateFrom: today } = getTodayRangeInMadrid(new Date());
	const tag = `M4 closeout smoke ${Date.now()}`;

	try {
		const candidate = await findCandidateContext();
		const secondaryClient = await findAnotherAssignedClient(
			candidate.commercialUserId,
			candidate.clientId,
		);
		const templateLines = await loadTemplateLines();

		await expectFailure(
			"pedido vacio rechazado",
			() =>
				createOrderForCommercialUser(candidate.commercialUserId, {
					clientId: candidate.clientId,
					notes: `${tag} empty`,
					lines: [],
				}),
			(error) =>
				error instanceof Error &&
				String(error.message).includes(
					"Debes indicar al menos un producto para el pedido",
				),
			"Se ha permitido crear un pedido vacio y deberia rechazarse",
		);

		const createdOrder = await createOrderForCommercialUser(
			candidate.commercialUserId,
			{
				clientId: candidate.clientId,
				notes: tag,
				lines: templateLines,
			},
		);
		let orderId = createdOrder.id;
		createdOrderIds.push(orderId);

		await updateOrderStatusForCommercialUser(candidate.commercialUserId, {
			orderId,
			statusId: ORDER_STATUS_IDS.CONFIRMED,
		});

		const estimateWithoutVisit = await getClientDeliveryEstimate(candidate.clientId);
		assertCondition(
			estimateWithoutVisit.status === "no_delivery_today" &&
				estimateWithoutVisit.estimatedArrivalTime === null,
			"La ETA del cliente no debería aparecer si el pedido confirmado aún no está vinculado a un reparto real",
		);
		console.log(
			`PASS ETA oculta sin reparto vinculado (${candidate.clientName})`,
		);

		const createdVisit = await createCommercialVisit({
			clientId: candidate.clientId,
			commercialId: candidate.commercialUserId,
			scheduledForDate: today,
			visitTypeId: COMMERCIAL_VISIT_TYPE_IDS.DELIVERY,
			notes: tag,
			orderIds: [orderId],
		});
		const visitId = createdVisit.id;
		createdVisitIds.push(visitId);

		const orderAfterLink = await getOrderDetailForCommercialUser(
			candidate.commercialUserId,
			orderId,
		);
		assertCondition(
			orderAfterLink.order.delivery_visit_id === visitId &&
				orderAfterLink.order.status_id === ORDER_STATUS_IDS.CONFIRMED,
			"El pedido confirmado deberia quedar vinculado al reparto planificado sin cambiar a un estado incoherente",
		);

		const estimateWithVisit = await getClientDeliveryEstimate(candidate.clientId);
		assertCondition(
			estimateWithVisit.estimatedArrivalTime !== null &&
				(estimateWithVisit.status === "scheduled" ||
					estimateWithVisit.status === "outside_visit_window"),
			"La ETA del cliente deberia aparecer cuando existe un reparto real con pedidos vinculados",
		);
		console.log(
			`PASS ETA visible con reparto real vinculado (${estimateWithVisit.status})`,
		);

		await updateCommercialVisit({
			visitId,
			commercialId: candidate.commercialUserId,
			statusId: COMMERCIAL_VISIT_STATUS_IDS.POSTPONED,
		});

		const orderAfterPostpone = await getOrderDetailForCommercialUser(
			candidate.commercialUserId,
			orderId,
		);
		assertCondition(
			orderAfterPostpone.order.delivery_visit_id === visitId &&
				orderAfterPostpone.order.status_id === ORDER_STATUS_IDS.CONFIRMED,
			"Aplazar un reparto no debería romper el enlace del pedido ni cambiar su estado confirmado",
		);

		const estimateAfterPostpone = await getClientDeliveryEstimate(
			candidate.clientId,
		);
		assertCondition(
			estimateAfterPostpone.status === "outside_visit_window" &&
				estimateAfterPostpone.estimatedArrivalTime === null,
			"Un reparto aplazado no debería seguir mostrando una ETA exacta al cliente",
		);
		console.log("PASS aplazamiento coherente con pedido enlazado y ETA anulada");

		await expectFailure(
			"visita aplazada bloquea modificaciones",
			() =>
				updateCommercialVisit({
					visitId,
					commercialId: candidate.commercialUserId,
					statusId: COMMERCIAL_VISIT_STATUS_IDS.CANCELLED,
				}),
			(error) =>
				error instanceof Error &&
				String(error.message).includes("visita está aplazada"),
			"Se ha permitido modificar una visita aplazada",
		);

		await cleanupTemporaryData([orderId], [visitId]);
		createdOrderIds.splice(createdOrderIds.indexOf(orderId), 1);
		createdVisitIds.splice(createdVisitIds.indexOf(visitId), 1);

		const replacementOrder = await createOrderForCommercialUser(
			candidate.commercialUserId,
			{
				clientId: candidate.clientId,
				notes: `${tag} cancellation baseline`,
				lines: templateLines,
			},
		);
		orderId = replacementOrder.id;
		createdOrderIds.push(orderId);

		await updateOrderStatusForCommercialUser(candidate.commercialUserId, {
			orderId,
			statusId: ORDER_STATUS_IDS.CONFIRMED,
		});

		const cancellationVisit = await createCommercialVisit({
			clientId: candidate.clientId,
			commercialId: candidate.commercialUserId,
			scheduledForDate: today,
			visitTypeId: COMMERCIAL_VISIT_TYPE_IDS.DELIVERY,
			notes: `${tag} cancellation baseline`,
			orderIds: [orderId],
		});
		const cancellationVisitId = cancellationVisit.id;
		createdVisitIds.push(cancellationVisitId);

		await updateCommercialVisit({
			visitId: cancellationVisitId,
			commercialId: candidate.commercialUserId,
			statusId: COMMERCIAL_VISIT_STATUS_IDS.CANCELLED,
		});

		const orderAfterCancelVisit = await getOrderDetailForCommercialUser(
			candidate.commercialUserId,
			orderId,
		);
		assertCondition(
			orderAfterCancelVisit.order.delivery_visit_id === null &&
				orderAfterCancelVisit.order.status_id === ORDER_STATUS_IDS.CONFIRMED,
			"Cancelar un reparto deberia desenganchar el pedido sin alterar de forma incoherente su estado confirmado",
		);

		const estimateAfterCancelVisit = await getClientDeliveryEstimate(
			candidate.clientId,
		);
		assertCondition(
			estimateAfterCancelVisit.status === "no_delivery_today" &&
				estimateAfterCancelVisit.estimatedArrivalTime === null,
			"Tras cancelar el reparto, el cliente no debería seguir viendo una ETA",
		);
		console.log("PASS cancelación de reparto coherente con desvinculación");

		const otherClientOrder = await createOrderForCommercialUser(
			candidate.commercialUserId,
			{
				clientId: secondaryClient.clientId,
				notes: `${tag} other client`,
				lines: templateLines,
			},
		);
		const otherClientOrderId = otherClientOrder.id;
		createdOrderIds.push(otherClientOrderId);

		await updateOrderStatusForCommercialUser(candidate.commercialUserId, {
			orderId: otherClientOrderId,
			statusId: ORDER_STATUS_IDS.CONFIRMED,
		});

		const cancelledCandidateOrder = await createOrderForCommercialUser(
			candidate.commercialUserId,
			{
				clientId: candidate.clientId,
				notes: `${tag} cancelled candidate`,
				lines: templateLines,
			},
		);
		const cancelledCandidateOrderId = cancelledCandidateOrder.id;
		createdOrderIds.push(cancelledCandidateOrderId);

		await updateOrderStatusForCommercialUser(candidate.commercialUserId, {
			orderId: cancelledCandidateOrderId,
			statusId: ORDER_STATUS_IDS.CONFIRMED,
		});
		await updateOrderStatusForCommercialUser(candidate.commercialUserId, {
			orderId: cancelledCandidateOrderId,
			statusId: ORDER_STATUS_IDS.CANCELLED,
		});

		const deliveredCandidateOrder = await createOrderForCommercialUser(
			candidate.commercialUserId,
			{
				clientId: candidate.clientId,
				notes: `${tag} delivered candidate`,
				lines: templateLines,
			},
		);
		const deliveredCandidateOrderId = deliveredCandidateOrder.id;
		createdOrderIds.push(deliveredCandidateOrderId);

		await updateOrderStatusForCommercialUser(candidate.commercialUserId, {
			orderId: deliveredCandidateOrderId,
			statusId: ORDER_STATUS_IDS.CONFIRMED,
		});

		const deliveredCandidateVisit = await createCommercialVisit({
			clientId: candidate.clientId,
			commercialId: candidate.commercialUserId,
			scheduledForDate: today,
			visitTypeId: COMMERCIAL_VISIT_TYPE_IDS.DELIVERY,
			notes: `${tag} delivered candidate visit`,
			orderIds: [deliveredCandidateOrderId],
		});
		createdVisitIds.push(deliveredCandidateVisit.id);

		await updateCommercialVisit({
			visitId: deliveredCandidateVisit.id,
			commercialId: candidate.commercialUserId,
			statusId: COMMERCIAL_VISIT_STATUS_IDS.COMPLETED,
			result: "Entrega de prueba completada",
			deliveredOrderQrs: [deliveredCandidateOrderId],
		});

		await expectFailure(
			"transicion invalida de pedido entregado a confirmado",
			() =>
				updateOrderStatusForCommercialUser(candidate.commercialUserId, {
					orderId: deliveredCandidateOrderId,
					statusId: ORDER_STATUS_IDS.CONFIRMED,
				}),
			(error) =>
				error instanceof Error &&
				String(error.message).includes(
					"No se puede cambiar un pedido en estado",
				),
			"Se ha permitido una transicion invalida sobre un pedido entregado",
		);

		const linkedVisit = await createCommercialVisit({
			clientId: candidate.clientId,
			commercialId: candidate.commercialUserId,
			scheduledForDate: today,
			visitTypeId: COMMERCIAL_VISIT_TYPE_IDS.DELIVERY,
			notes: `${tag} linked cancellation`,
			orderIds: [orderId],
		});
		const linkedVisitId = linkedVisit.id;
		createdVisitIds.push(linkedVisitId);

		await expectFailure(
			"reparto rechaza pedidos cancelados",
			() =>
				updateCommercialVisit({
					visitId: linkedVisitId,
					commercialId: candidate.commercialUserId,
					orderIds: [orderId, cancelledCandidateOrderId],
				}),
			(error) =>
				error instanceof Error &&
				String(error.message).includes(
					"Solo se pueden vincular pedidos confirmados a un reparto",
				),
			"Se ha permitido vincular un pedido cancelado a un reparto activo",
		);

		await expectFailure(
			"reparto rechaza pedidos entregados",
			() =>
				updateCommercialVisit({
					visitId: linkedVisitId,
					commercialId: candidate.commercialUserId,
					orderIds: [orderId, deliveredCandidateOrderId],
				}),
			(error) =>
				error instanceof Error &&
				String(error.message).includes(
					"Solo se pueden vincular pedidos confirmados a un reparto",
				),
			"Se ha permitido vincular un pedido entregado a un reparto activo",
		);

		await expectFailure(
			"reparto rechaza pedidos de otro cliente",
			() =>
				updateCommercialVisit({
					visitId: linkedVisitId,
					commercialId: candidate.commercialUserId,
					orderIds: [orderId, otherClientOrderId],
				}),
			(error) =>
				error instanceof Error &&
				String(error.message).includes(
					"Solo puedes vincular pedidos del mismo cliente de la visita",
				),
			"Se ha permitido vincular un pedido de otro cliente al reparto",
		);

		const cancelledOrder = await updateOrderStatusForCommercialUser(
			candidate.commercialUserId,
			{
				orderId,
				statusId: ORDER_STATUS_IDS.CANCELLED,
			},
		);
		assertCondition(
			cancelledOrder.order.status_id === ORDER_STATUS_IDS.CANCELLED &&
				cancelledOrder.order.delivery_visit_id === null,
			"Un pedido confirmado deberia poder cancelarse sin dejar visita vinculada",
		);
		const ds = await getDataSource();
		const linkedVisitRecord = await ds.getRepository(CommercialVisit).findOne({
			where: { id: linkedVisitId },
		});
		const remainingLinkedOrders = await ds.getRepository(Order).count({
			where: { delivery_visit_id: linkedVisitId },
		});
		assertCondition(
			linkedVisitRecord?.status_id === COMMERCIAL_VISIT_STATUS_IDS.CANCELLED,
			"Cancelar un pedido ya vinculado deberia dejar cancelada la visita huérfana",
		);
		assertCondition(
			remainingLinkedOrders === 0,
			"La visita cancelada no debería conservar pedidos enlazados",
		);
		console.log("PASS cancelación explícita de pedido coherente");
		console.log(
			"PASS cancelación de pedido vinculado sin dejar reparto activo huerfano",
		);

		const summary = await listOrdersByClientId(candidate.clientId);
		assertCondition(
			summary.some((order) => order.id === orderId && order.status_code === "cancelled"),
			"El pedido cancelado deberia seguir siendo visible con el estado final correcto",
		);

		console.log(
			`PASS resumen final visible para ${candidate.clientName} con estado cancelado`,
		);
		console.log("OK M4 closeout smoke: 13/13 comprobaciones superadas");
	} finally {
		await cleanupTemporaryData(createdOrderIds, createdVisitIds);
		const ds = await getDataSource();
		await ds.destroy();
	}
}

main().catch((error) => {
	console.error("FAIL M4 closeout smoke");
	console.error(error);
	process.exit(1);
});
