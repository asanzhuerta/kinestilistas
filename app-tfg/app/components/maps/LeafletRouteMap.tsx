"use client";

import { useEffect, useMemo, useState } from "react";
import {
	MapContainer,
	Marker,
	Popup,
	Polyline,
	TileLayer,
	useMap,
} from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import { ensureLeafletDefaultIcon } from "./leaflet-default-icon";
import type { RoutePoint } from "./route-map-types";

type LeafletRouteMapProps = {
	startPoint?: RoutePoint | null;
	endPoint?: RoutePoint | null;
	waypoints?: RoutePoint[];
	heightClassName?: string;
};

// --------------------------------------------------------------------------
// HELPER PARA AJUSTAR EL MAPA A LOS PUNTOS DISPONIBLES
// --------------------------------------------------------------------------
function FitBounds({ points }: { points: RoutePoint[] }) {
	const map = useMap();

	useEffect(() => {
		if (points.length === 0) return;

		if (points.length === 1) {
			map.setView([points[0].lat, points[0].lng], 13);
			return;
		}

		const bounds = L.latLngBounds(
			points.map((point) => [point.lat, point.lng]),
		);
		map.fitBounds(bounds, { padding: [30, 30] });
	}, [map, points]);

	return null;
}

export default function LeafletRouteMap({
	startPoint = null,
	endPoint = null,
	waypoints = [],
	heightClassName = "h-[24rem]",
}: LeafletRouteMapProps) {
	const [routePositions, setRoutePositions] = useState<LatLngExpression[]>([]);
	const [routeError, setRouteError] = useState("");

	useEffect(() => {
		ensureLeafletDefaultIcon();
	}, []);

	const points = useMemo(() => {
		const result: RoutePoint[] = [];

		if (startPoint) result.push(startPoint);
		result.push(...waypoints);
		if (endPoint) result.push(endPoint);

		return result;
	}, [startPoint, endPoint, waypoints]);

	useEffect(() => {
		let ignore = false;

		async function loadRoute() {
			if (points.length < 2) {
				setRoutePositions([]);
				setRouteError("");
				return;
			}

			try {
				setRouteError("");

				// ------------------------------------------------------------------
				// CÁLCULO DE RUTA CON OSRM
				// ------------------------------------------------------------------
				// Para la base del proyecto usamos el endpoint público por simplicidad.
				// Más adelante conviene mover esto a un servicio propio o self-hosted.
				const coordinates = points
					.map((point) => `${point.lng},${point.lat}`)
					.join(";");

				const osrmBaseUrl =
					process.env.NEXT_PUBLIC_OSRM_BASE_URL ||
					"https://router.project-osrm.org";

				const response = await fetch(
					`${osrmBaseUrl}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`,
					{ cache: "no-store" },
				);

				const data = await response.json().catch(() => null);

				if (!response.ok || !data?.routes?.[0]?.geometry?.coordinates) {
					throw new Error("No se pudo calcular la ruta");
				}

				const coordinatesList = data.routes[0].geometry.coordinates as [
					number,
					number,
				][];

				if (!ignore) {
					setRoutePositions(
						coordinatesList.map(([lng, lat]) => [lat, lng] as LatLngExpression),
					);
				}
			} catch {
				if (!ignore) {
					setRoutePositions(points.map((point) => [point.lat, point.lng]));
					setRouteError(
						"No se pudo calcular la ruta real. Se muestra una unión aproximada entre puntos.",
					);
				}
			}
		}

		void loadRoute();

		return () => {
			ignore = true;
		};
	}, [points]);

	const fallbackCenter: LatLngExpression = [36.5297, -6.2926];

	return (
		<div className="space-y-3">
			{routeError ? (
				<div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
					{routeError}
				</div>
			) : null}

			<div
				className={`overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm ${heightClassName}`}
			>
				<MapContainer
					center={
						points.length > 0 ? [points[0].lat, points[0].lng] : fallbackCenter
					}
					zoom={13}
					scrollWheelZoom
					className="h-full w-full"
				>
					<TileLayer
						attribution="&copy; OpenStreetMap contributors"
						url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					/>

					{points.length > 0 ? <FitBounds points={points} /> : null}

					{startPoint ? (
						<Marker position={[startPoint.lat, startPoint.lng]}>
							<Popup>
								<strong>{startPoint.label}</strong>
								{startPoint.description ? (
									<>
										<br />
										{startPoint.description}
									</>
								) : null}
							</Popup>
						</Marker>
					) : null}

					{waypoints.map((point) => (
						<Marker key={point.id} position={[point.lat, point.lng]}>
							<Popup>
								<strong>{point.label}</strong>
								{point.description ? (
									<>
										<br />
										{point.description}
									</>
								) : null}
							</Popup>
						</Marker>
					))}

					{endPoint ? (
						<Marker position={[endPoint.lat, endPoint.lng]}>
							<Popup>
								<strong>{endPoint.label}</strong>
								{endPoint.description ? (
									<>
										<br />
										{endPoint.description}
									</>
								) : null}
							</Popup>
						</Marker>
					) : null}

					{routePositions.length >= 2 ? (
						<Polyline positions={routePositions} />
					) : null}
				</MapContainer>
			</div>
		</div>
	);
}
