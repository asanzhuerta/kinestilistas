"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { buildGoogleMapsDirectionsUrl } from "@/app/components/maps/google-maps-url";
import type { CommercialRoutePreviewResponse } from "@/app/components/maps/route-map-types";

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

type BrowserLocationState =
	| {
			status: "loading";
	  }
	| {
			status: "granted";
			lat: number;
			lng: number;
	  }
	| {
			status: "unavailable";
			message: string;
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

	const [browserLocation, setBrowserLocation] = useState<BrowserLocationState>({
		status: "loading",
	});

	// --------------------------------------------------------------------------
	// OBTENCIÓN DE UBICACIÓN ACTUAL
	// --------------------------------------------------------------------------
	// Intentamos usar la ubicación real del comercial como inicio de ruta.
	// Si falla, el backend usará el fallback configurado en perfil si existe.
	useEffect(() => {
		if (!("geolocation" in navigator)) {
			setBrowserLocation({
				status: "unavailable",
				message: "Tu navegador no soporta geolocalización.",
			});
			return;
		}

		navigator.geolocation.getCurrentPosition(
			(position) => {
				setBrowserLocation({
					status: "granted",
					lat: position.coords.latitude,
					lng: position.coords.longitude,
				});
			},
			() => {
				setBrowserLocation({
					status: "unavailable",
					message:
						"No se pudo obtener tu ubicación actual. Se intentará usar el punto de salida guardado.",
				});
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 60000,
			},
		);
	}, []);

	// --------------------------------------------------------------------------
	// CARGA DE PREVIEW
	// --------------------------------------------------------------------------
	// Esperamos a resolver el intento de geolocalización para pedir la preview.
	useEffect(() => {
		let ignore = false;

		async function loadPreview() {
			if (browserLocation.status === "loading") {
				return;
			}

			try {
				setLoading(true);
				setError("");

				const url = new URL(
					"/api/commercial/routes/preview",
					window.location.origin,
				);

				if (browserLocation.status === "granted") {
					url.searchParams.set("startLat", String(browserLocation.lat));
					url.searchParams.set("startLng", String(browserLocation.lng));
				}

				const response = await fetch(url.toString(), {
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
	}, [browserLocation]);

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

			{browserLocation.status === "loading" ? (
				<div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
					Intentando obtener tu ubicación actual para iniciar la ruta...
				</div>
			) : null}

			{browserLocation.status === "unavailable" ? (
				<div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
					{browserLocation.message}
				</div>
			) : null}

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

					{preview.usingCurrentLocation ? (
						<div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
							La ruta se ha generado usando tu ubicación actual como punto de
							inicio.
						</div>
					) : null}

					{!preview.usingCurrentLocation && preview.usingSavedStartFallback ? (
						<div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
							No se pudo usar tu ubicación actual. Se ha utilizado el punto de
							salida guardado en tu perfil como fallback.
						</div>
					) : null}

					{!preview.usingCurrentLocation && !preview.usingSavedStartFallback ? (
						<div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
							No hay punto de inicio disponible. Para mejorar la ruta, activa la
							geolocalización o configura un punto de salida de respaldo en tu
							perfil.
						</div>
					) : null}

					{!preview.hasConfiguredEndPoint &&
					!(preview.startPoint && preview.endPoint) ? (
						<div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
							Aún no tienes configurado un punto final de ruta en tu perfil.
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
