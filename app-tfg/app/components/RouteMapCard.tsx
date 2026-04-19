"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { buildGoogleMapsDirectionsUrl } from "@/app/components/maps/google-maps-url";
import type {
	CommercialRoutePreviewResponse,
	RoutePoint,
} from "@/app/components/maps/route-map-types";

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
};

type ApiError = {
	error?: string;
	code?: string;
};

export default function RouteMapCard({
	title = "Ruta diaria",
	subtitle = "Vista previa de la ruta calculada sobre tu cartera asignada",
	className = "",
}: RouteMapCardProps) {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [preview, setPreview] = useState<CommercialRoutePreviewResponse | null>(
		null,
	);

	useEffect(() => {
		let ignore = false;

		async function loadPreview() {
			try {
				setLoading(true);
				setError("");

				const response = await fetch("/api/commercial/routes/preview", {
					method: "GET",
					cache: "no-store",
				});

				const data = (await response.json().catch(() => null)) as
					| CommercialRoutePreviewResponse
					| ApiError
					| null;

				if (!response.ok) {
					throw new Error(
						data && typeof data === "object" && "error" in data && data.error
							? data.error
							: "No se pudo cargar la ruta",
					);
				}

				if (!ignore) {
					setPreview(data as CommercialRoutePreviewResponse);
				}
			} catch (err) {
				if (!ignore) {
					setError(
						err instanceof Error
							? err.message
							: "Error al cargar la ruta del comercial",
					);
				}
			} finally {
				if (!ignore) {
					setLoading(false);
				}
			}
		}

		void loadPreview();

		return () => {
			ignore = true;
		};
	}, []);

	const startPoint = preview?.startPoint ?? null;
	const endPoint = preview?.endPoint ?? null;
	const waypoints = preview?.waypoints ?? [];

	const googleMapsUrl = useMemo(
		() => buildGoogleMapsDirectionsUrl(startPoint, waypoints, endPoint),
		[startPoint, waypoints, endPoint],
	);

	const hasEnoughPointsForMap =
		(startPoint ? 1 : 0) + waypoints.length + (endPoint ? 1 : 0) >= 1;

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

			{loading ? (
				<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
					Cargando vista previa de la ruta...
				</div>
			) : null}

			{!loading && error ? (
				<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
					{error}
				</div>
			) : null}

			{!loading && !error && preview ? (
				<div className="space-y-4">
					<div className="flex flex-wrap gap-3 text-sm text-slate-600">
						<div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
							<span className="font-semibold text-slate-900">
								{preview.totalAssignedClients}
							</span>{" "}
							clientes asignados
						</div>

						<div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
							<span className="font-semibold text-slate-900">
								{preview.mappedClients}
							</span>{" "}
							con coordenadas
						</div>

						<div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
							<span className="font-semibold text-slate-900">
								{preview.skippedClients}
							</span>{" "}
							sin geolocalizar
						</div>
					</div>

					{!preview.hasRouteStartConfig ? (
						<div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
							Tu perfil comercial aún no tiene configurado un punto de salida.
							La ruta se muestra solo con los clientes geolocalizados.
						</div>
					) : null}

					{waypoints.length === 0 ? (
						<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
							No hay clientes asignados con coordenadas suficientes para pintar
							la ruta todavía.
						</div>
					) : null}

					{hasEnoughPointsForMap ? (
						<LeafletRouteMap
							startPoint={startPoint}
							waypoints={waypoints}
							endPoint={endPoint}
						/>
					) : null}
				</div>
			) : null}
		</div>
	);
}
