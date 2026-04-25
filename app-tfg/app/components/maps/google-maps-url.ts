import type { RoutePoint } from "@/lib/contracts/commercial-route";

// --------------------------------------------------------------------------
// GOOGLE MAPS URL
// --------------------------------------------------------------------------
// Genera una URL universal de Google Maps para abrir la ruta en la app/web
// con navegación real. No requiere Google Maps API key.
export function buildGoogleMapsDirectionsUrl(
	startPoint: RoutePoint | null,
	waypoints: RoutePoint[],
	endPoint: RoutePoint | null,
) {
	const points = [
		...(startPoint ? [startPoint] : []),
		...waypoints,
		...(endPoint ? [endPoint] : []),
	];

	if (points.length < 2) {
		return "https://www.google.com/maps";
	}

	const origin = `${points[0].lat},${points[0].lng}`;
	const destination = `${points[points.length - 1].lat},${points[points.length - 1].lng}`;

	const intermediatePoints = points.slice(1, -1);
	const params = new URLSearchParams({
		api: "1",
		origin,
		destination,
		travelmode: "driving",
		dir_action: "navigate",
	});

	if (intermediatePoints.length > 0) {
		params.set(
			"waypoints",
			intermediatePoints
				.map((point) => `${point.lat},${point.lng}`)
				.join("|"),
		);
	}

	return `https://www.google.com/maps/dir/?${params.toString()}`;
}
