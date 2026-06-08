"use client";

import { useEffect, useMemo } from "react";
import {
	MapContainer,
	Marker,
	Popup,
	Polyline,
	TileLayer,
	useMap,
} from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import { useApiRequest } from "@/app/hooks/api/useApiRequest";
import { requestJson } from "@/lib/api/client";
import { formatTimeLabel } from "@/lib/utils/time";
import { ensureLeafletDefaultIcon } from "./leaflet-default-icon";
import type { RoutePoint } from "@/lib/contracts/commercial-route";

type LeafletRouteMapProps = {
	startPoint?: RoutePoint | null;
	endPoint?: RoutePoint | null;
	waypoints?: RoutePoint[];
	heightClassName?: string;
};

type OsrmRouteResponse = {
	routes?: Array<{
		geometry?: {
			coordinates?: [number, number][];
		};
	}>;
};

const EMPTY_ROUTE_POINTS: RoutePoint[] = [];
const EMPTY_ROUTE_POSITIONS: LatLngExpression[] = [];
const ROUTE_FALLBACK_MESSAGE =
	"No se pudo calcular la ruta real. Se muestra una union aproximada entre puntos.";

function FitBounds({ points }: { points: RoutePoint[] }) {
	const map = useMap();

	useEffect(() => {
		if (points.length === 0) {
			return;
		}

		if (points.length === 1) {
			map.setView([points[0].lat, points[0].lng], 13);
			return;
		}

		const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
		map.fitBounds(bounds, { padding: [30, 30] });
	}, [map, points]);

	return null;
}

function ResizeMapOnLayoutChange() {
	const map = useMap();

	useEffect(() => {
		const container = map.getContainer();
		const invalidateSize = () => {
			map.invalidateSize({ animate: false });
		};
		const initialTimer = window.setTimeout(invalidateSize, 0);
		const settledTimer = window.setTimeout(invalidateSize, 250);
		let resizeObserver: ResizeObserver | null = null;

		if (typeof ResizeObserver !== "undefined") {
			resizeObserver = new ResizeObserver(invalidateSize);
			resizeObserver.observe(container);
		}

		return () => {
			window.clearTimeout(initialTimer);
			window.clearTimeout(settledTimer);
			resizeObserver?.disconnect();
		};
	}, [map]);

	return null;
}

function buildMarkerIcon(options: {
	label: string;
	subLabel?: string | null;
	tone: "emerald" | "sky" | "rose" | "slate";
}) {
	const tones = {
		emerald: {
			circle: "#047857",
			pill: "#d1fae5",
			pillText: "#065f46",
			shadow: "rgba(4, 120, 87, 0.24)",
		},
		sky: {
			circle: "#0369a1",
			pill: "#e0f2fe",
			pillText: "#0c4a6e",
			shadow: "rgba(3, 105, 161, 0.24)",
		},
		rose: {
			circle: "#be123c",
			pill: "#ffe4e6",
			pillText: "#9f1239",
			shadow: "rgba(190, 18, 60, 0.24)",
		},
		slate: {
			circle: "#334155",
			pill: "#e2e8f0",
			pillText: "#334155",
			shadow: "rgba(51, 65, 85, 0.22)",
		},
	}[options.tone];

	const html = `
		<div style="display:flex;flex-direction:column;align-items:center;gap:6px;transform:translateY(-6px);">
			<div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;background:${tones.circle};color:#fff;font-weight:700;font-size:14px;border:2px solid #fff;box-shadow:0 10px 18px ${tones.shadow};">
				${options.label}
			</div>
			${
				options.subLabel
					? `<div style="padding:3px 8px;border-radius:9999px;background:${tones.pill};color:${tones.pillText};font-size:11px;font-weight:700;line-height:1;white-space:nowrap;border:1px solid rgba(255,255,255,0.8);box-shadow:0 8px 16px rgba(15,23,42,0.08);">${options.subLabel}</div>`
					: ""
			}
		</div>
	`;

	return L.divIcon({
		html,
		className: "route-map-marker",
		iconSize: [56, 62],
		iconAnchor: [28, 54],
		popupAnchor: [0, -48],
	});
}

function getWaypointIcon(point: RoutePoint) {
	return buildMarkerIcon({
		label: String(point.sequence ?? "•"),
		subLabel: point.estimatedArrivalTime ?? null,
		tone: point.isPastVisitWindow ? "rose" : "sky",
	});
}

function getStartIcon() {
	return buildMarkerIcon({
		label: "I",
		subLabel: null,
		tone: "emerald",
	});
}

function getEndIcon() {
	return buildMarkerIcon({
		label: "F",
		subLabel: null,
		tone: "slate",
	});
}

function buildRoutePolylineUrl(points: RoutePoint[]) {
	const coordinates = points.map((point) => `${point.lng},${point.lat}`).join(";");
	const osrmBaseUrl =
		process.env.NEXT_PUBLIC_OSRM_BASE_URL || "https://router.project-osrm.org";

	return `${osrmBaseUrl}/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`;
}

async function loadRoutePolyline(points: RoutePoint[]) {
	const data = await requestJson<OsrmRouteResponse>(buildRoutePolylineUrl(points), {
		cache: "no-store",
		fallbackMessage: ROUTE_FALLBACK_MESSAGE,
	});
	const coordinates = data?.routes?.[0]?.geometry?.coordinates;

	if (!coordinates?.length) {
		throw new Error(ROUTE_FALLBACK_MESSAGE);
	}

	return coordinates.map(([lng, lat]) => [lat, lng] as LatLngExpression);
}

export default function LeafletRouteMap({
	startPoint = null,
	endPoint = null,
	waypoints = EMPTY_ROUTE_POINTS,
	heightClassName = "h-[24rem]",
}: LeafletRouteMapProps) {
	const {
		data: routeGeometry,
		error: routeError,
		run,
		setData: setRouteGeometry,
		setError: setRouteError,
	} = useApiRequest<LatLngExpression[]>(EMPTY_ROUTE_POSITIONS);

	useEffect(() => {
		ensureLeafletDefaultIcon();
	}, []);

	const points = useMemo(() => {
		const result: RoutePoint[] = [];

		if (startPoint) {
			result.push(startPoint);
		}

		result.push(...waypoints);

		if (endPoint) {
			result.push(endPoint);
		}

		return result;
	}, [startPoint, endPoint, waypoints]);

	const pointPositions = useMemo(
		() => points.map((point) => [point.lat, point.lng] as LatLngExpression),
		[points],
	);

	useEffect(() => {
		if (points.length < 2) {
			setRouteGeometry([]);
			setRouteError("");
			return;
		}

		void run(() => loadRoutePolyline(points));
	}, [points, run, setRouteError, setRouteGeometry]);

	const routePositions =
		routeGeometry && routeGeometry.length >= 2 ? routeGeometry : pointPositions;

	const fallbackCenter: LatLngExpression = [36.5297, -6.2926];

	return (
		<div className="h-full space-y-3">
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

					<ResizeMapOnLayoutChange />

					{points.length > 0 ? <FitBounds points={points} /> : null}

					{startPoint ? (
						<Marker
							position={[startPoint.lat, startPoint.lng]}
							icon={getStartIcon()}
						>
							<Popup>
								<div className="space-y-1 text-sm">
									<p className="font-semibold text-slate-900">
										{startPoint.label}
									</p>
									{startPoint.description ? (
										<p className="text-slate-600">{startPoint.description}</p>
									) : null}
								</div>
							</Popup>
						</Marker>
					) : null}

					{waypoints.map((point) => (
						<Marker
							key={point.id}
							position={[point.lat, point.lng]}
							icon={getWaypointIcon(point)}
						>
							<Popup>
								<div className="space-y-1 text-sm">
									<p className="font-semibold text-slate-900">
										#{point.sequence ?? "-"} / {point.label}
									</p>
									{point.estimatedArrivalTime ? (
										<p className="text-slate-700">
											Llegada aprox:{" "}
											<span className="font-medium">
												{point.estimatedArrivalTime}
											</span>
										</p>
									) : null}
									{point.visitWindowStartTime && point.visitWindowEndTime ? (
										<p className="text-slate-600">
											Franja: {formatTimeLabel(point.visitWindowStartTime)} -{" "}
											{formatTimeLabel(point.visitWindowEndTime)}
										</p>
									) : null}
									{typeof point.stopDurationMinutes === "number" ? (
										<p className="text-slate-600">
											Parada estimada: {point.stopDurationMinutes} min
										</p>
									) : null}
									{point.description ? (
										<p className="text-slate-600">{point.description}</p>
									) : null}
									{point.isPastVisitWindow ? (
										<p className="font-medium text-rose-700">
											La llegada prevista queda fuera de la franja del cliente.
										</p>
									) : null}
								</div>
							</Popup>
						</Marker>
					))}

					{endPoint ? (
						<Marker position={[endPoint.lat, endPoint.lng]} icon={getEndIcon()}>
							<Popup>
								<div className="space-y-1 text-sm">
									<p className="font-semibold text-slate-900">
										{endPoint.label}
									</p>
									{endPoint.description ? (
										<p className="text-slate-600">{endPoint.description}</p>
									) : null}
								</div>
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
