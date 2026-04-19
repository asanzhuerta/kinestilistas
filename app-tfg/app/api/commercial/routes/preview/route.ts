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

// Convierte valores de BBDD o query string a número usable.
function parseCoordinate(value: unknown) {
	if (value === null || value === undefined || value === "") {
		return null;
	}

	const parsed = Number(value);

	return Number.isFinite(parsed) ? parsed : null;
}

// Distancia simple para una primera versión de preview.
// Más adelante se puede sustituir por tiempos reales / matriz de distancias.
function distanceBetween(
	from: { lat: number; lng: number },
	to: { lat: number; lng: number },
) {
	const dLat = from.lat - to.lat;
	const dLng = from.lng - to.lng;

	return Math.sqrt(dLat * dLat + dLng * dLng);
}

// Ordena clientes con heurística nearest-neighbor.
// No pretende ser optimización avanzada, pero sirve como preview útil.
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
// Genera una preview de ruta para el comercial autenticado usando:
//
// 1. Ubicación actual enviada por query string (prioridad máxima)
// 2. Punto de salida guardado en perfil comercial como fallback
// 3. Punto final configurable del perfil comercial
//
// No guarda la ruta todavía: solo prepara datos para mapa y navegación.
export async function GET(request: Request) {
	try {
		const session = (await auth()) as SessionLike;

		if (!session?.user || session.user.role !== "commercial") {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const commercial = await requireCommercialByUserId(session.user.id);
		const assignedClients = await listClientsByCommercialId(commercial.id);

		const { searchParams } = new URL(request.url);

		// ------------------------------------------------------------------
		// Inicio de ruta
		// ------------------------------------------------------------------
		// Prioridad:
		// 1. ubicación actual del navegador
		// 2. fallback guardado en perfil
		const currentStartLat = parseCoordinate(searchParams.get("startLat"));
		const currentStartLng = parseCoordinate(searchParams.get("startLng"));

		const savedStartLat = parseCoordinate(commercial.route_start_lat);
		const savedStartLng = parseCoordinate(commercial.route_start_lng);

		const endLat = parseCoordinate(commercial.route_end_lat);
		const endLng = parseCoordinate(commercial.route_end_lng);

		const usingCurrentLocation =
			currentStartLat !== null && currentStartLng !== null;

		const usingSavedStartFallback =
			!usingCurrentLocation &&
			savedStartLat !== null &&
			savedStartLng !== null;

		const startPoint: RoutePoint | null = usingCurrentLocation
			? {
					id: "route-start-current",
					label: "Ubicación actual",
					lat: currentStartLat!,
					lng: currentStartLng!,
					description: "Punto de inicio detectado desde el dispositivo",
				}
			: usingSavedStartFallback
				? {
						id: "route-start-fallback",
						label: "Punto de salida guardado",
						lat: savedStartLat!,
						lng: savedStartLng!,
						description:
							commercial.route_start_address || "Fallback configurado en perfil",
					}
				: null;

		// ------------------------------------------------------------------
		// Fin de ruta
		// ------------------------------------------------------------------
		// Si return_to_start está activo y existe startPoint, el final será volver
		// al punto de inicio real del día. Si no, usamos el final configurable.
		const configuredEndPoint: RoutePoint | null =
			endLat !== null && endLng !== null
				? {
						id: "route-end-config",
						label: "Punto final configurado",
						lat: endLat,
						lng: endLng,
						description:
							commercial.route_end_address || "Fin de jornada configurado",
					}
				: null;

		const endPoint =
			commercial.return_to_start && startPoint
				? {
						...startPoint,
						id: "route-end-return",
						label: "Regreso al punto de salida",
						description: "Fin de ruta volviendo al punto de inicio del día",
					}
				: configuredEndPoint;

		// ------------------------------------------------------------------
		// Clientes asignados con coordenadas válidas
		// ------------------------------------------------------------------
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

		const response: CommercialRoutePreviewResponse = {
			startPoint,
			endPoint,
			waypoints: orderedWaypoints,
			totalAssignedClients: assignedClients.length,
			mappedClients: orderedWaypoints.length,
			skippedClients: assignedClients.length - orderedWaypoints.length,
			usingCurrentLocation,
			usingSavedStartFallback,
			hasConfiguredEndPoint: !!configuredEndPoint,
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