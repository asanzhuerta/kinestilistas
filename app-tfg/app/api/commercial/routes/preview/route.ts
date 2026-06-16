import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	getRequestSearchParams,
	jsonFromError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	buildRoutePreviewEndPoint,
	buildRoutePreviewStartPoint,
} from "@/lib/commercial/route-preview-points";
import {
	buildCommercialDailyRoutePlan,
	getTodayRangeInMadrid,
	parseCoordinate,
	type RoutePlanningVisit,
} from "@/lib/commercial/daily-route-planning";
import type { CommercialRoutePreviewResponse } from "@/lib/contracts/commercial-route";
import { COMMERCIAL_VISIT_STATUS_IDS } from "@/lib/typeorm/constants/catalog-ids";
import { requireCommercialByUserId } from "@/lib/typeorm/services/commercial/commercial";
import { listCommercialVisitsByCommercial } from "@/lib/typeorm/services/commercial/commercial-visit";

// GET /api/commercial/routes/preview?startLat=&startLng=
// Calcula una vista previa de la ruta diaria del comercial con orden, ETA y resumen temporal.
export async function GET(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const commercial = await requireCommercialByUserId(user.id);
		const searchParams = getRequestSearchParams(request);
		const currentStartLat = parseCoordinate(searchParams.get("startLat"));
		const currentStartLng = parseCoordinate(searchParams.get("startLng"));
		const savedStartLat = parseCoordinate(commercial.route_start_lat);
		const savedStartLng = parseCoordinate(commercial.route_start_lng);
		const endLat = parseCoordinate(commercial.route_end_lat);
		const endLng = parseCoordinate(commercial.route_end_lng);

		const { startPoint, usingCurrentLocation, usingSavedStartFallback } =
			buildRoutePreviewStartPoint({
				currentStartLat,
				currentStartLng,
				savedStartLat,
				savedStartLng,
				savedStartAddress: commercial.route_start_address,
			});

		const { endPoint, hasConfiguredEndPoint } = buildRoutePreviewEndPoint({
			endLat,
			endLng,
			endAddress: commercial.route_end_address,
			returnToStart: commercial.return_to_start,
			startPoint,
		});

		const { dateFrom, dateTo } = getTodayRangeInMadrid();
		const visits = (await listCommercialVisitsByCommercial({
			commercialId: commercial.id,
			statusId: COMMERCIAL_VISIT_STATUS_IDS.PLANNED,
			dateFrom,
			dateTo,
		})) as RoutePlanningVisit[];

		const routePlan = buildCommercialDailyRoutePlan({
			commercial,
			visits,
			startPoint,
		});

		const response: CommercialRoutePreviewResponse = {
			startPoint,
			endPoint,
			waypoints: routePlan.waypoints,
			totalAssignedClients: routePlan.totalAssignedClients,
			mappedClients: routePlan.mappedClients,
			skippedClients: routePlan.skippedClients,
			timingSummary: routePlan.timingSummary,
			usingCurrentLocation,
			usingSavedStartFallback,
			hasConfiguredEndPoint,
		};

		return NextResponse.json(response, { status: 200 });
	} catch (error) {
		console.error("[commercial/routes/preview][GET] error:", error);
		return jsonFromError(error, "Error al generar la vista previa de la ruta");
	}
}
