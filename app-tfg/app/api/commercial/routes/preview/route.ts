import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { COMMERCIAL_VISIT_STATUS_IDS } from "@/lib/typeorm/constants/catalog-ids";
import { listCommercialVisitsByCommercial } from "@/lib/typeorm/services/commercial/commercial-visit";
import {
	CommercialProfileError,
	requireCommercialByUserId,
} from "@/lib/typeorm/services/commercial/commercial";
import {
	buildCommercialDailyRoutePlan,
	getTodayRangeInMadrid,
	parseCoordinate,
	type RoutePlanningVisit,
} from "@/lib/commercial/daily-route-planning";
import type {
	CommercialRoutePreviewResponse,
	RoutePoint,
} from "@/app/components/maps/route-map-types";

type SessionLike = {
	user?: {
		id: string;
		role: string;
	};
} | null;

function buildStartPoint(input: {
	currentStartLat: number | null;
	currentStartLng: number | null;
	savedStartLat: number | null;
	savedStartLng: number | null;
	savedStartAddress: string | null;
}) {
	const usingCurrentLocation =
		input.currentStartLat !== null && input.currentStartLng !== null;
	const usingSavedStartFallback =
		!usingCurrentLocation &&
		input.savedStartLat !== null &&
		input.savedStartLng !== null;

	const startPoint: RoutePoint | null = usingCurrentLocation
		? {
				id: "route-start-current",
				label: "Ubicación actual",
				lat: input.currentStartLat!,
				lng: input.currentStartLng!,
				description: "Punto de inicio detectado desde el dispositivo",
			}
		: usingSavedStartFallback
			? {
					id: "route-start-fallback",
					label: "Punto de salida guardado",
					lat: input.savedStartLat!,
					lng: input.savedStartLng!,
					description:
						input.savedStartAddress || "Fallback configurado en perfil",
				}
			: null;

	return {
		startPoint,
		usingCurrentLocation,
		usingSavedStartFallback,
	};
}

function buildEndPoint(input: {
	endLat: number | null;
	endLng: number | null;
	endAddress: string | null;
	returnToStart: boolean;
	startPoint: RoutePoint | null;
}) {
	const configuredEndPoint: RoutePoint | null =
		input.endLat !== null && input.endLng !== null
			? {
					id: "route-end-config",
					label: "Punto final configurado",
					lat: input.endLat,
					lng: input.endLng,
					description: input.endAddress || "Fin de jornada configurado",
				}
			: null;

	const endPoint =
		input.returnToStart && input.startPoint
			? {
					...input.startPoint,
					id: "route-end-return",
					label: "Regreso al punto de salida",
					description: "Fin de ruta volviendo al punto de inicio del día",
				}
			: configuredEndPoint;

	return {
		endPoint,
		hasConfiguredEndPoint: Boolean(configuredEndPoint),
	};
}

export async function GET(request: Request) {
	try {
		const session = (await auth()) as SessionLike;

		if (!session?.user || session.user.role !== "commercial") {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const commercial = await requireCommercialByUserId(session.user.id);
		const { searchParams } = new URL(request.url);
		const currentStartLat = parseCoordinate(searchParams.get("startLat"));
		const currentStartLng = parseCoordinate(searchParams.get("startLng"));
		const savedStartLat = parseCoordinate(commercial.route_start_lat);
		const savedStartLng = parseCoordinate(commercial.route_start_lng);
		const endLat = parseCoordinate(commercial.route_end_lat);
		const endLng = parseCoordinate(commercial.route_end_lng);

		const { startPoint, usingCurrentLocation, usingSavedStartFallback } =
			buildStartPoint({
				currentStartLat,
				currentStartLng,
				savedStartLat,
				savedStartLng,
				savedStartAddress: commercial.route_start_address,
			});

		const { endPoint, hasConfiguredEndPoint } = buildEndPoint({
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

		if (error instanceof CommercialProfileError) {
			return NextResponse.json(
				{ error: error.message, code: error.code },
				{ status: error.status },
			);
		}

		return NextResponse.json(
			{ error: "Error al generar la vista previa de la ruta" },
			{ status: 500 },
		);
	}
}
