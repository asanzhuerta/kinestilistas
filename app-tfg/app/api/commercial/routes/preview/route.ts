import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { listClientsByCommercialId } from "@/lib/typeorm/services/commercial/client";
import {
	CommercialProfileError,
	requireCommercialByUserId,
} from "@/lib/typeorm/services/commercial/commercial";
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

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

// Convierte un valor string/number nullable de BBDD a número válido.
function parseCoordinate(value: unknown) {
	if (value === null || value === undefined || value === "") {
		return null;
	}

	const parsed = Number(value);

	return Number.isFinite(parsed) ? parsed : null;
}

// Distancia euclídea simple.
// Para esta preview inicial es suficiente y rápida.
// Más adelante se podrá sustituir por tiempos reales o matriz de distancias.
function distanceBetween(
	from: { lat: number; lng: number },
	to: { lat: number; lng: number },
) {
	const dLat = from.lat - to.lat;
	const dLng = from.lng - to.lng;

	return Math.sqrt(dLat * dLat + dLng * dLng);
}

// Ordena clientes con una heurística nearest-neighbor simple.
// No es optimización avanzada, pero sirve como v1 funcional del preview.
function sortWaypointsByNearestNeighbor(
	points: RoutePoint[],
	startPoint: RoutePoint | null,
) {
	if (points.length <= 1) {
		return points;
	}

	const remaining = [...points];
	const ordered: RoutePoint[] = [];

	let current = startPoint
		? { lat: startPoint.lat, lng: startPoint.lng }
		: { lat: remaining[0].lat, lng: remaining[0].lng };

	while (remaining.length > 0) {
		let nearestIndex = 0;
		let nearestDistance = distanceBetween(current, remaining[0]);

		for (let i = 1; i < remaining.length; i += 1) {
			const candidateDistance = distanceBetween(current, remaining[i]);

			if (candidateDistance < nearestDistance) {
				nearestDistance = candidateDistance;
				nearestIndex = i;
			}
		}

		const [nextPoint] = remaining.splice(nearestIndex, 1);
		ordered.push(nextPoint);
		current = { lat: nextPoint.lat, lng: nextPoint.lng };
	}

	return ordered;
}

// --------------------------------------------------------------------------
// GET /api/commercial/routes/preview
// --------------------------------------------------------------------------
// Devuelve una preview simple de ruta usando:
// - clientes asignados al comercial
// - coordenadas geolocalizadas del cliente
// - configuración de origen/fin del comercial
//
// Esta ruta no guarda nada en BD todavía: solo prepara datos para pintar
// la ruta en el dashboard comercial y abrirla luego en Google Maps.
export async function GET() {
	try {
		const session = (await auth()) as SessionLike;

		if (!session?.user || session.user.role !== "commercial") {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const commercial = await requireCommercialByUserId(session.user.id);
		const assignedClients = await listClientsByCommercialId(commercial.id);

		const startLat = parseCoordinate(commercial.route_start_lat);
		const startLng = parseCoordinate(commercial.route_start_lng);
		const endLat = parseCoordinate(commercial.route_end_lat);
		const endLng = parseCoordinate(commercial.route_end_lng);

		const startPoint: RoutePoint | null =
			startLat !== null && startLng !== null
				? {
						id: "route-start",
						label: "Punto de salida",
						lat: startLat,
						lng: startLng,
						description: commercial.route_start_address || "Inicio de jornada",
					}
				: null;

		const explicitEndPoint: RoutePoint | null =
			endLat !== null && endLng !== null
				? {
						id: "route-end",
						label: "Punto final",
						lat: endLat,
						lng: endLng,
						description: commercial.route_end_address || "Fin de jornada",
					}
				: null;

		const mappedClients = assignedClients.flatMap((client) => {
			const lat = parseCoordinate((client as { lat?: unknown }).lat);
			const lng = parseCoordinate((client as { lng?: unknown }).lng);

			if (lat === null || lng === null) {
				return [];
			}

			return [
				{
					id: client.id,
					label: client.name,
					lat,
					lng,
					description:
						client.address && client.city
							? `${client.address} · ${client.city}`
							: client.user?.email || "Cliente asignado",
				},
			] satisfies RoutePoint[];
		});

		const orderedWaypoints = sortWaypointsByNearestNeighbor(
			mappedClients,
			startPoint,
		);

		const endPoint =
			commercial.return_to_start && startPoint
				? {
						...startPoint,
						id: "route-end-return",
						label: "Regreso al punto de salida",
					}
				: explicitEndPoint;

		const response: CommercialRoutePreviewResponse = {
			startPoint,
			endPoint,
			waypoints: orderedWaypoints,
			totalAssignedClients: assignedClients.length,
			mappedClients: orderedWaypoints.length,
			skippedClients: assignedClients.length - orderedWaypoints.length,
			hasRouteStartConfig: !!startPoint,
			hasRouteEndConfig: !!endPoint,
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
