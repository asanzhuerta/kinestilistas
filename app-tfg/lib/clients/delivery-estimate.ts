import type { DeliveryEstimateResponse } from "@/lib/contracts/delivery-estimate";
import {
	buildCommercialDailyRoutePlan,
	getTodayRangeInMadrid,
	parseCoordinate,
	type RoutePlanningVisit,
} from "@/lib/commercial/daily-route-planning";
import {
	COMMERCIAL_VISIT_STATUS_IDS,
	COMMERCIAL_VISIT_TYPE_IDS,
} from "@/lib/typeorm/constants/catalog-ids";
import { getActiveAssignmentByClientId } from "@/lib/typeorm/services/commercial/client-commercial-assignment";
import { listCommercialVisitsByCommercial } from "@/lib/typeorm/services/commercial/commercial-visit";
import { listOrdersByClientId } from "@/lib/typeorm/services/orders/order";

export async function getClientDeliveryEstimate(
	clientId: string,
	options: {
		date?: Date;
	} = {},
): Promise<DeliveryEstimateResponse> {
	const { dateFrom, dateTo } = getTodayRangeInMadrid(options.date);
	const activeAssignment = await getActiveAssignmentByClientId(clientId);

	if (!activeAssignment?.commercial) {
		return {
			status: "no_active_commercial",
			date: dateFrom,
			message: "Todavía no tienes un comercial asignado para planificar reparto.",
			estimatedArrivalTime: null,
			sequence: null,
			windowStartTime: null,
			windowEndTime: null,
			commercialName: null,
		};
	}

	const commercial = activeAssignment.commercial;
	const [visits, clientOrders] = await Promise.all([
		listCommercialVisitsByCommercial({
			commercialId: commercial.id,
			dateFrom,
			dateTo,
		}) as Promise<(RoutePlanningVisit & { status_id: number })[]>,
		listOrdersByClientId(clientId),
	]);

	const deliveryVisitIdsWithOrders = new Set(
		clientOrders
			.flatMap((order) => [
				order.delivery_visit_id,
				...order.deliveries.map((delivery) => delivery.delivery_visit_id),
			])
			.filter((visitId): visitId is string => Boolean(visitId)),
	);

	const clientPendingDeliveryVisit =
		visits.find(
			(visit) =>
				deliveryVisitIdsWithOrders.has(visit.id) &&
				visit.client?.id === clientId &&
				visit.visit_type_id === COMMERCIAL_VISIT_TYPE_IDS.DELIVERY &&
				(visit.status_id === COMMERCIAL_VISIT_STATUS_IDS.PLANNED ||
					visit.status_id === COMMERCIAL_VISIT_STATUS_IDS.POSTPONED),
		) ?? null;

	if (!clientPendingDeliveryVisit) {
		return {
			status: "no_delivery_today",
			date: dateFrom,
			message: "No hay reparto planificado para hoy en tu ficha.",
			estimatedArrivalTime: null,
			sequence: null,
			windowStartTime: activeAssignment.client?.visit_window_start_time ?? null,
			windowEndTime: activeAssignment.client?.visit_window_end_time ?? null,
			commercialName: commercial.user?.name ?? null,
		};
	}

	if (
		clientPendingDeliveryVisit.status_id ===
		COMMERCIAL_VISIT_STATUS_IDS.POSTPONED
	) {
		return {
			status: "outside_visit_window",
			date: dateFrom,
			message:
				"Tu reparto de hoy ha quedado aplazado porque ya se ha superado tu franja de visita.",
			estimatedArrivalTime: null,
			sequence: null,
			windowStartTime:
				clientPendingDeliveryVisit.client?.visit_window_start_time ?? null,
			windowEndTime:
				clientPendingDeliveryVisit.client?.visit_window_end_time ?? null,
			commercialName: commercial.user?.name ?? null,
		};
	}

	const plannedVisits = visits.filter(
		(visit) => visit.status_id === COMMERCIAL_VISIT_STATUS_IDS.PLANNED,
	);
	const savedStartLat = parseCoordinate(commercial.route_start_lat);
	const savedStartLng = parseCoordinate(commercial.route_start_lng);
	const startPoint =
		savedStartLat !== null && savedStartLng !== null
			? {
					id: "route-start-fallback",
					label: "Punto de salida guardado",
					lat: savedStartLat,
					lng: savedStartLng,
					description:
						commercial.route_start_address || "Inicio de ruta configurado",
				}
			: null;

	const routePlan = buildCommercialDailyRoutePlan({
		commercial,
		visits: plannedVisits,
		startPoint,
		date: options.date,
	});

	const clientWaypoint =
		routePlan.waypoints.find((point) => point.id === clientId) ?? null;

	if (!clientWaypoint) {
		return {
			status: "scheduled_without_eta",
			date: dateFrom,
			message:
				"Tu reparto está previsto para hoy, pero aún falta una geolocalización válida para calcular una hora aproximada.",
			estimatedArrivalTime: null,
			sequence: null,
			windowStartTime: activeAssignment.client?.visit_window_start_time ?? null,
			windowEndTime: activeAssignment.client?.visit_window_end_time ?? null,
			commercialName: commercial.user?.name ?? null,
		};
	}

	return {
		status: clientWaypoint.isPastVisitWindow
			? "outside_visit_window"
			: "scheduled",
		date: dateFrom,
		message: clientWaypoint.isPastVisitWindow
			? "La llegada estimada ya queda fuera de tu franja de visitas y debe replanificarse."
			: "Tu reparto de hoy ya tiene una hora aproximada calculada.",
		estimatedArrivalTime: clientWaypoint.estimatedArrivalTime ?? null,
		sequence: clientWaypoint.sequence ?? null,
		windowStartTime: clientWaypoint.visitWindowStartTime ?? null,
		windowEndTime: clientWaypoint.visitWindowEndTime ?? null,
		commercialName: commercial.user?.name ?? null,
	};
}
