"use client";

import dynamic from "next/dynamic";
import { buildGoogleMapsDirectionsUrl } from "@/app/components/maps/google-maps-url";
import type { RoutePoint } from "@/app/components/maps/route-map-types";

// --------------------------------------------------------------------------
// CARGA DINÁMICA DEL MAPA
// --------------------------------------------------------------------------
// Leaflet depende de window/document, así que no puede renderizarse en SSR.
// Lo cargamos solo en cliente para evitar el error "window is not defined".
const LeafletRouteMap = dynamic(
	() => import("@/app/components/maps/LeafletRouteMap"),
	{
		ssr: false,
		loading: () => (
			<div className="h-[24rem] rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
				Cargando mapa...
			</div>
		),
	},
);

type RouteMapCardProps = {
	title?: string;
	subtitle?: string;
	className?: string;
	startPoint?: RoutePoint | null;
	endPoint?: RoutePoint | null;
	waypoints?: RoutePoint[];
};

const DEFAULT_START_POINT: RoutePoint = {
	id: "start",
	label: "Almacén / Punto de salida",
	lat: 36.5297,
	lng: -6.2926,
	description: "Punto inicial de la ruta comercial",
};

const DEFAULT_WAYPOINTS: RoutePoint[] = [
	{
		id: "wp-1",
		label: "Cliente 1",
		lat: 36.5164,
		lng: -6.2807,
		description: "Parada comercial de ejemplo",
	},
	{
		id: "wp-2",
		label: "Cliente 2",
		lat: 36.5038,
		lng: -6.2751,
		description: "Parada comercial de ejemplo",
	},
];

const DEFAULT_END_POINT: RoutePoint = {
	id: "end",
	label: "Fin de ruta",
	lat: 36.5297,
	lng: -6.2926,
	description: "Punto final de la jornada",
};

export default function RouteMapCard({
	title = "Ruta diaria",
	subtitle = "Vista previa del recorrido comercial",
	className = "",
	startPoint = DEFAULT_START_POINT,
	waypoints = DEFAULT_WAYPOINTS,
	endPoint = DEFAULT_END_POINT,
}: RouteMapCardProps) {
	const googleMapsUrl = buildGoogleMapsDirectionsUrl(
		startPoint,
		waypoints,
		endPoint,
	);

	return (
		<div
			className={`rounded-3xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
		>
			<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p className="text-sm font-medium uppercase tracking-wide text-slate-500">
						M2 · Rutas comerciales
					</p>
					<h2 className="text-lg font-semibold text-slate-900">{title}</h2>
					<p className="mt-1 text-sm text-slate-600">{subtitle}</p>
				</div>

				<a
					href={googleMapsUrl}
					target="_blank"
					rel="noreferrer"
					className="inline-flex items-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
				>
					Abrir en Google Maps
				</a>
			</div>

			<LeafletRouteMap
				startPoint={startPoint}
				waypoints={waypoints}
				endPoint={endPoint}
			/>
		</div>
	);
}