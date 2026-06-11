import type { RoutePoint } from "@/lib/contracts/commercial-route";

export function buildRoutePreviewStartPoint(input: {
	currentStartLat: number | null;
	currentStartLng: number | null;
	savedStartLat: number | null;
	savedStartLng: number | null;
	savedStartAddress: string | null;
}) {
	const hasCurrentLocation =
		input.currentStartLat !== null && input.currentStartLng !== null;
	const hasSavedStart =
		input.savedStartLat !== null && input.savedStartLng !== null;
	const usingCurrentLocation = !hasSavedStart && hasCurrentLocation;
	const usingSavedStartFallback =
		hasSavedStart;

	const startPoint: RoutePoint | null = usingSavedStartFallback
		? {
				id: "route-start-fallback",
				label: "Punto de salida guardado",
				lat: input.savedStartLat!,
				lng: input.savedStartLng!,
				description:
					input.savedStartAddress || "Fallback configurado en perfil",
			}
		: usingCurrentLocation
			? {
					id: "route-start-current",
					label: "Ubicación actual",
					lat: input.currentStartLat!,
					lng: input.currentStartLng!,
					description: "Punto de inicio detectado desde el dispositivo",
				}
			: null;

	return {
		startPoint,
		usingCurrentLocation,
		usingSavedStartFallback,
	};
}

export function buildRoutePreviewEndPoint(input: {
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
