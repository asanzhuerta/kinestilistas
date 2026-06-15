import {
	buildRoutePreviewEndPoint,
	buildRoutePreviewStartPoint,
} from "@/lib/commercial/route-preview-points";

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

	console.log("Business route smoke OK");
}

main();
