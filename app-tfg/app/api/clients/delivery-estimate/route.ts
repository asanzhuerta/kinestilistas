import { NextResponse } from "next/server";
import { auth } from "@/auth";
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

type SessionLike = {
	user?: {
		id: string;
		role: string;
	};
} | null;

type DeliveryEstimateResponse = {
	status:
		| "scheduled"
		| "outside_visit_window"
		| "scheduled_without_eta"
		| "no_delivery_today"
		| "no_active_commercial";
	date: string;
	message: string;
	estimatedArrivalTime: string | null;
	sequence: number | null;
	windowStartTime: string | null;
	windowEndTime: string | null;
	commercialName: string | null;
};

export async function GET() {
	try {
		const session = (await auth()) as SessionLike;

		if (!session?.user || session.user.role !== "client") {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const userId = session.user.id;

		const activeAssignment = await getActiveAssignmentByClientId(userId);
		const { dateFrom, dateTo } = getTodayRangeInMadrid();

		if (!activeAssignment?.commercial) {
			const response: DeliveryEstimateResponse = {
				status: "no_active_commercial",
				date: dateFrom,
				message: "Todavia no tienes un comercial asignado para planificar reparto.",
				estimatedArrivalTime: null,
				sequence: null,
				windowStartTime: null,
				windowEndTime: null,
				commercialName: null,
			};

			return NextResponse.json(response, { status: 200 });
		}

		const commercial = activeAssignment.commercial;
		const visits = (await listCommercialVisitsByCommercial({
			commercialId: commercial.id,
			statusId: COMMERCIAL_VISIT_STATUS_IDS.PLANNED,
			dateFrom,
			dateTo,
		})) as RoutePlanningVisit[];

		const hasDeliveryToday = visits.some(
			(visit) =>
				visit.client?.id === userId &&
				visit.visit_type_id === COMMERCIAL_VISIT_TYPE_IDS.DELIVERY,
		);

		if (!hasDeliveryToday) {
			const response: DeliveryEstimateResponse = {
				status: "no_delivery_today",
				date: dateFrom,
				message: "No hay reparto planificado para hoy en tu ficha.",
				estimatedArrivalTime: null,
				sequence: null,
				windowStartTime: activeAssignment.client?.visit_window_start_time ?? null,
				windowEndTime: activeAssignment.client?.visit_window_end_time ?? null,
				commercialName: commercial.user?.name ?? null,
			};

			return NextResponse.json(response, { status: 200 });
		}

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
			visits,
			startPoint,
		});

		const clientWaypoint =
			routePlan.waypoints.find((point) => point.id === userId) ?? null;

		if (!clientWaypoint) {
			const response: DeliveryEstimateResponse = {
				status: "scheduled_without_eta",
				date: dateFrom,
				message:
					"Tu reparto esta previsto para hoy, pero aun falta una geolocalizacion valida para calcular una hora aproximada.",
				estimatedArrivalTime: null,
				sequence: null,
				windowStartTime: activeAssignment.client?.visit_window_start_time ?? null,
				windowEndTime: activeAssignment.client?.visit_window_end_time ?? null,
				commercialName: commercial.user?.name ?? null,
			};

			return NextResponse.json(response, { status: 200 });
		}

		const response: DeliveryEstimateResponse = {
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

		return NextResponse.json(response, { status: 200 });
	} catch (error) {
		console.error("[clients/delivery-estimate][GET] error:", error);

		return NextResponse.json(
			{ error: "Error al calcular la hora aproximada de reparto" },
			{ status: 500 },
		);
	}
}
