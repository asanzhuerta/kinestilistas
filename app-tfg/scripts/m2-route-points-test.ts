import {
	buildRoutePreviewEndPoint,
	buildRoutePreviewStartPoint,
} from "@/lib/commercial/route-preview-points";
import { buildCommercialDailyRoutePlan } from "@/lib/commercial/daily-route-planning";
import { COMMERCIAL_VISIT_TYPE_IDS } from "@/lib/typeorm/constants/catalog-ids";
import { buildGoogleMapsDirectionsUrl } from "@/app/components/maps/google-maps-url";

function assertCondition(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

function assertEqual<T>(actual: T, expected: T, message: string) {
	if (actual !== expected) {
		throw new Error(`${message}. Recibido: ${actual}; esperado: ${expected}`);
	}
}

function main() {
	const currentStart = buildRoutePreviewStartPoint({
		currentStartLat: 36.5169,
		currentStartLng: -6.2751,
		savedStartLat: 36.685,
		savedStartLng: -6.126,
		savedStartAddress: "Base guardada",
	});

	assertCondition(currentStart.startPoint, "No se ha creado punto inicial actual");
	assertEqual(currentStart.startPoint.id, "route-start-current", "La ubicacion actual debe tener prioridad");
	assertEqual(currentStart.usingCurrentLocation, true, "Debe marcarse el uso de ubicacion actual");
	assertEqual(currentStart.usingSavedStartFallback, false, "No debe marcar fallback si existe ubicacion actual");

	const fallbackStart = buildRoutePreviewStartPoint({
		currentStartLat: null,
		currentStartLng: null,
		savedStartLat: 36.685,
		savedStartLng: -6.126,
		savedStartAddress: "Base guardada",
	});

	assertCondition(fallbackStart.startPoint, "No se ha creado punto inicial de fallback");
	assertEqual(fallbackStart.startPoint.id, "route-start-fallback", "Debe usar el punto guardado si no hay ubicacion actual");
	assertEqual(fallbackStart.usingCurrentLocation, false, "No debe marcar ubicacion actual sin coordenadas actuales");
	assertEqual(fallbackStart.usingSavedStartFallback, true, "Debe marcar fallback guardado");

	const missingStart = buildRoutePreviewStartPoint({
		currentStartLat: null,
		currentStartLng: null,
		savedStartLat: null,
		savedStartLng: null,
		savedStartAddress: null,
	});

	assertEqual(missingStart.startPoint, null, "No debe crear inicio sin coordenadas");

	const configuredEnd = buildRoutePreviewEndPoint({
		endLat: 36.1333,
		endLng: -5.4505,
		endAddress: "Fin de jornada",
		returnToStart: false,
		startPoint: fallbackStart.startPoint,
	});

	assertCondition(configuredEnd.endPoint, "No se ha creado punto final configurado");
	assertEqual(configuredEnd.endPoint.id, "route-end-config", "Debe usar el fin de jornada configurado");
	assertEqual(configuredEnd.hasConfiguredEndPoint, true, "Debe marcar que existe fin configurado");

	const returnEnd = buildRoutePreviewEndPoint({
		endLat: 36.1333,
		endLng: -5.4505,
		endAddress: "Fin de jornada",
		returnToStart: true,
		startPoint: fallbackStart.startPoint,
	});

	assertCondition(returnEnd.endPoint, "No se ha creado punto de regreso");
	assertEqual(returnEnd.endPoint.id, "route-end-return", "El regreso debe reutilizar el punto de salida");
	assertEqual(returnEnd.endPoint.lat, fallbackStart.startPoint.lat, "El regreso conserva latitud de salida");
	assertEqual(returnEnd.endPoint.lng, fallbackStart.startPoint.lng, "El regreso conserva longitud de salida");
	assertEqual(returnEnd.hasConfiguredEndPoint, true, "Debe conservar la senal de fin configurado disponible");

	const routePlan = buildCommercialDailyRoutePlan({
		commercial: {
			workday_start_time: "09:00:00",
			workday_end_time: "18:00:00",
			delivery_visit_duration_minutes: 10,
			routine_visit_duration_minutes: 35,
		},
		visits: [
			{
				id: "visit-delivery",
				visit_type_id: COMMERCIAL_VISIT_TYPE_IDS.DELIVERY,
				client: {
					id: "client-barbate",
					name: "Salon Barbate",
					address: "C. Guadalquivir, 11",
					city: "Barbate",
					lat: 36.1919,
					lng: -5.9214,
				},
			},
		],
		startPoint: fallbackStart.startPoint,
		endPoint: returnEnd.endPoint,
		legTravelMinutes: [50, 49],
		date: new Date("2026-06-16T09:05:00+02:00"),
	});

	assertEqual(routePlan.waypoints[0]?.estimatedArrivalTime, "09:55", "La ETA del cliente usa solo el tramo de ida real");
	assertEqual(routePlan.waypoints[0]?.estimatedDepartureTime, "10:05", "La salida del cliente suma la duracion configurada de visita");
	assertEqual(routePlan.endPoint?.estimatedArrivalTime, "10:54", "La ETA final suma visita y tramo de regreso");
	assertEqual(routePlan.timingSummary.approxTravelMinutes, 99, "El resumen suma ida y regreso reales");
	assertEqual(routePlan.timingSummary.totalCommittedRouteMinutes, 109, "El tiempo comprometido suma trayectos y visita");

	const googleMapsUrl = buildGoogleMapsDirectionsUrl(
		fallbackStart.startPoint,
		routePlan.waypoints,
		returnEnd.endPoint,
	);
	const googleMapsParams = new URL(googleMapsUrl).searchParams;

	assertEqual(googleMapsParams.get("destination"), "36.1919,-5.9214", "Google Maps debe navegar al cliente, no al regreso automatico");
	assertEqual(googleMapsParams.has("waypoints"), false, "Una unica visita no debe quedar como waypoint intermedio si el regreso es automatico");

	console.log("M2 route points test OK");
}

main();
