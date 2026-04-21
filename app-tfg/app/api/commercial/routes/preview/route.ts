// app/api/commercial/routes/preview/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { COMMERCIAL_VISIT_STATUS_IDS } from "@/lib/typeorm/constants/catalog-ids";
import { listCommercialVisitsByCommercial } from "@/lib/typeorm/services/commercial/commercial-visit";
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

type RoutePreviewVisitClient = {
	id: string;
	name: string;
	address?: string | null;
	city?: string | null;
	lat?: unknown;
	lng?: unknown;
	user?: {
		email?: string | null;
	} | null;
};

type RoutePreviewVisit = {
	client?: RoutePreviewVisitClient | null;
};

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

// Devuelve la fecha actual "vista desde Madrid".
function getMadridDateParts(date: Date) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/Madrid",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(date);

	return {
		year: parts.find((part) => part.type === "year")?.value ?? "1970",
		month: parts.find((part) => part.type === "month")?.value ?? "01",
		day: parts.find((part) => part.type === "day")?.value ?? "01",
	};
}

// Obtiene el offset actual de Madrid en formato +HH:MM o -HH:MM.

// Rango del día actual en Europe/Madrid.
// Esto evita errores si el servidor no está en la misma zona horaria.
function getTodayRangeInMadrid() {
	const now = new Date();
	const { year, month, day } = getMadridDateParts(now);
	const today = `${year}-${month}-${day}`;

	return {
		dateFrom: today,
		dateTo: today,
	};
}

// Distancia Haversine para una heurística local algo mejor que restar lat/lng.
function toRadians(value: number) {
	return (value * Math.PI) / 180;
}

function distanceBetween(
	from: { lat: number; lng: number },
	to: { lat: number; lng: number },
) {
	const earthRadiusKm = 6371;

	const dLat = toRadians(to.lat - from.lat);
	const dLng = toRadians(to.lng - from.lng);

	const fromLat = toRadians(from.lat);
	const toLat = toRadians(to.lat);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(fromLat) *
			Math.cos(toLat) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return earthRadiusKm * c;
}

// Ordena clientes con heurística nearest-neighbor.
// Sigue sin ser optimización real por tiempo de carretera, pero mejora
// bastante frente al orden aleatorio y no requiere servicios externos.
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

		current = {
			lat: nextPoint.lat,
			lng: nextPoint.lng,
		};
	}

	return ordered;
}

// --------------------------------------------------------------------------
// GET /api/commercial/routes/preview
// --------------------------------------------------------------------------

// Genera una preview de la ruta diaria del comercial autenticado usando:
//
// 1. Ubicación actual enviada por query string (prioridad máxima)
// 2. Punto de salida guardado en perfil comercial como fallback
// 3. Punto final configurable del perfil comercial
// 4. SOLO clientes con visita planificada HOY
//
// No guarda la ruta todavía: solo prepara datos para mapa y navegación.
export async function GET(request: Request) {
	try {
		const session = (await auth()) as SessionLike;

		if (!session?.user || session.user.role !== "commercial") {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const commercial = await requireCommercialByUserId(session.user.id);
		const { searchParams } = new URL(request.url);

		// ------------------------------------------------------------------
		// Inicio de ruta
		// ------------------------------------------------------------------

		const currentStartLat = parseCoordinate(searchParams.get("startLat"));
		const currentStartLng = parseCoordinate(searchParams.get("startLng"));

		const savedStartLat = parseCoordinate(commercial.route_start_lat);
		const savedStartLng = parseCoordinate(commercial.route_start_lng);

		const endLat = parseCoordinate(commercial.route_end_lat);
		const endLng = parseCoordinate(commercial.route_end_lng);

		const usingCurrentLocation =
			currentStartLat !== null && currentStartLng !== null;

		const usingSavedStartFallback =
			!usingCurrentLocation && savedStartLat !== null && savedStartLng !== null;

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
							commercial.route_start_address ||
							"Fallback configurado en perfil",
					}
				: null;

		// ------------------------------------------------------------------
		// Fin de ruta
		// ------------------------------------------------------------------

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
		// Visitas planificadas de HOY
		// ------------------------------------------------------------------

		const { dateFrom, dateTo } = getTodayRangeInMadrid();

		const visits = await listCommercialVisitsByCommercial({
			commercialId: commercial.id,
			statusId: COMMERCIAL_VISIT_STATUS_IDS.PLANNED,
			dateFrom,
			dateTo,
		});

		// ------------------------------------------------------------------
		// Deduplicado por cliente del día
		// ------------------------------------------------------------------

		const clientsOfTheDay = new Map<
			string,
			{
				client: RoutePreviewVisitClient;
				point: RoutePoint | null;
			}
		>();

		for (const visit of visits) {
			const client = visit.client;

			if (!client) {
				continue;
			}

			if (clientsOfTheDay.has(client.id)) {
				continue;
			}

			const lat = parseCoordinate(client.lat);
			const lng = parseCoordinate(client.lng);

			const point =
				lat !== null && lng !== null
					? {
							id: client.id,
							label: client.name,
							lat,
							lng,
							description:
								client.address && client.city
									? `${client.address} · ${client.city}`
									: client.user?.email || "Cliente con visita hoy",
						}
					: null;

			clientsOfTheDay.set(client.id, {
				client,
				point,
			});
		}

		const mappedClients = Array.from(clientsOfTheDay.values())
			.map((entry) => entry.point)
			.filter((point): point is RoutePoint => point !== null);

		const orderedWaypoints = sortWaypointsByNearestNeighbor(
			mappedClients,
			startPoint,
		);

		const totalClientsToday = clientsOfTheDay.size;
		const totalMappedClients = orderedWaypoints.length;

		const response: CommercialRoutePreviewResponse = {
			startPoint,
			endPoint,
			waypoints: orderedWaypoints,
			totalAssignedClients: totalClientsToday,
			mappedClients: totalMappedClients,
			skippedClients: totalClientsToday - totalMappedClients,
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
