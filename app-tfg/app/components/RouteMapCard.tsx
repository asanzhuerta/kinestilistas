"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { buildGoogleMapsDirectionsUrl } from "@/app/components/maps/google-maps-url";
import type { CommercialRoutePreviewResponse } from "@/app/components/maps/route-map-types";

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

function formatMinutes(value: number | null | undefined) {
	if (typeof value !== "number" || Number.isNaN(value)) {
		return "Sin definir";
	}

	if (value < 60) {
		return `${value} min`;
	}

	const hours = Math.floor(value / 60);
	const minutes = value % 60;

	if (minutes === 0) {
		return `${hours} h`;
	}

	return `${hours} h ${minutes} min`;
}

function formatTimeLabel(value: string | null | undefined) {
	if (!value) {
		return "--:--";
	}

	return value.slice(0, 5);
}

function buildCommittedTimeDescription(
	travelMinutes: number,
	waitingMinutes: number,
) {
	const parts = [`${formatMinutes(travelMinutes)} en trayectos`];

	if (waitingMinutes > 0) {
		parts.push(`${formatMinutes(waitingMinutes)} de espera`);
	}

	return parts.join(" · ");
}

export default function RouteMapCard({
	title = "Ruta diaria",
	subtitle = "Vista previa de la ruta calculada con tus visitas planificadas para hoy",
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

	useEffect(() => {
		if (!("geolocation" in navigator)) {
			setBrowserLocation({
				status: "unavailable",
				message: "Tu navegador no soporta geolocalizacion.",
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
						"No se pudo obtener tu ubicacion actual. Se intentara usar el punto de salida guardado.",
				});
			},
			{
				enableHighAccuracy: true,
				timeout: 10000,
				maximumAge: 60000,
			},
		);
	}, []);

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
	const waypoints = useMemo(() => preview?.waypoints ?? [], [preview?.waypoints]);
	const timingSummary = preview?.timingSummary ?? null;

	const googleMapsUrl = useMemo(
		() => buildGoogleMapsDirectionsUrl(startPoint, waypoints, endPoint),
		[startPoint, waypoints, endPoint],
	);

	const hasEnoughPointsForMap =
		(startPoint ? 1 : 0) + waypoints.length + (endPoint ? 1 : 0) >= 1;
	const hasValidWorkdayRange = Boolean(timingSummary?.hasValidWorkdayRange);
	const hasWorkdayConfig = Boolean(timingSummary?.hasWorkdayConfig);
	const overbookedMinutes = timingSummary?.overbookedMinutes ?? null;
	const pastWindowStopsCount = timingSummary?.pastWindowStopsCount ?? 0;

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
					Intentando obtener tu ubicacion actual para iniciar la ruta...
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
							clientes con visita hoy
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

						{timingSummary ? (
							<div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2">
								<span className="font-semibold text-slate-900">
									{timingSummary.plannedVisitsCount}
								</span>{" "}
								visitas planificadas
							</div>
						) : null}
					</div>

					{timingSummary ? (
						<div className="grid gap-3 md:grid-cols-3">
							<div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
									Jornada base
								</p>
								<p className="mt-2 text-lg font-semibold text-slate-900">
									{hasWorkdayConfig
										? `${formatTimeLabel(timingSummary.workdayStartTime)} - ${formatTimeLabel(timingSummary.workdayEndTime)}`
										: "Sin definir"}
								</p>
								<p className="mt-1 text-sm text-slate-600">
									{hasValidWorkdayRange
										? `${formatMinutes(timingSummary.totalWorkdayMinutes)} totales · ahora ${timingSummary.currentTimeLabel}`
										: hasWorkdayConfig
											? "El fin de jornada debe ser posterior al inicio."
											: "Configura tu horario habitual en Ajustes."}
								</p>
							</div>

							<div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
									Tiempo comprometido
								</p>
								<p className="mt-2 text-lg font-semibold text-slate-900">
									{formatMinutes(timingSummary.totalCommittedRouteMinutes)}
								</p>
								<p className="mt-1 text-sm text-slate-600">
									{timingSummary.deliveryVisitsCount} reparto ·{" "}
									{timingSummary.routineVisitsCount} rutinarias
								</p>
								<p className="mt-1 text-sm text-slate-500">
									{buildCommittedTimeDescription(
										timingSummary.approxTravelMinutes,
										timingSummary.totalWaitingMinutes,
									)}
								</p>
							</div>

							<div
								className={`rounded-3xl p-4 ${
									hasValidWorkdayRange && (overbookedMinutes ?? 0) > 0
										? "border border-red-200 bg-red-50"
										: "border border-slate-200 bg-slate-50"
								}`}
							>
								<p
									className={`text-xs font-medium uppercase tracking-wide ${
										hasValidWorkdayRange && (overbookedMinutes ?? 0) > 0
											? "text-red-600"
											: "text-slate-500"
									}`}
								>
									Margen del dia
								</p>
								<p
									className={`mt-2 text-lg font-semibold ${
										hasValidWorkdayRange && (overbookedMinutes ?? 0) > 0
											? "text-red-700"
											: "text-slate-900"
									}`}
								>
									{hasValidWorkdayRange
										? (overbookedMinutes ?? 0) > 0
											? `${formatMinutes(overbookedMinutes)} de exceso`
											: formatMinutes(
													timingSummary.remainingOperationalMarginMinutes,
												)
										: "Pendiente"}
								</p>
								<p
									className={`mt-1 text-sm ${
										hasValidWorkdayRange && (overbookedMinutes ?? 0) > 0
											? "text-red-700"
											: "text-slate-600"
									}`}
								>
									{hasValidWorkdayRange
										? (overbookedMinutes ?? 0) > 0
											? `La ruta ya supera la jornada disponible desde las ${timingSummary.currentTimeLabel}.`
											: `Quedan ${formatMinutes(timingSummary.remainingWorkdayMinutes)} de jornada real desde ahora.`
										: "Completa tu horario para calcular el margen real."}
								</p>
							</div>
						</div>
					) : null}

					{timingSummary && !hasWorkdayConfig ? (
						<div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
							Aun no has definido tu jornada base. Configurala en{" "}
							<a
								href="/commercials/settings"
								className="font-semibold underline underline-offset-2"
							>
								Ajustes
							</a>{" "}
							para que el sistema calcule el tiempo maximo disponible en ruta.
						</div>
					) : null}

					{timingSummary && hasWorkdayConfig && !hasValidWorkdayRange ? (
						<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
							El horario base no es valido. Revisa en Ajustes que el fin de
							jornada sea posterior al inicio para poder calcular el margen de
							ruta.
						</div>
					) : null}

					{timingSummary &&
					hasValidWorkdayRange &&
					(overbookedMinutes ?? 0) > 0 ? (
						<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
							La planificacion actual supera la jornada disponible desde este
							momento por <strong>{formatMinutes(overbookedMinutes)}</strong>.
							Conviene reordenar o liberar paradas antes de salir a ruta.
						</div>
					) : null}

					{timingSummary && pastWindowStopsCount > 0 ? (
						<div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
							Hay <strong>{pastWindowStopsCount}</strong> parada
							{pastWindowStopsCount === 1 ? "" : "s"} cuya llegada estimada ya
							queda fuera de la franja de visita del cliente.
						</div>
					) : null}

					{preview.usingCurrentLocation ? (
						<div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
							La ruta se ha generado usando tu ubicacion actual como punto de
							inicio.
						</div>
					) : null}

					{!preview.usingCurrentLocation && preview.usingSavedStartFallback ? (
						<div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
							No se pudo usar tu ubicacion actual. Se ha utilizado el punto de
							salida guardado en tu perfil como fallback.
						</div>
					) : null}

					{!preview.usingCurrentLocation && !preview.usingSavedStartFallback ? (
						<div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
							No hay punto de inicio disponible. Para mejorar la ruta, activa la
							geolocalizacion o configura un punto de salida de respaldo en tu
							perfil.
						</div>
					) : null}

					{!preview.hasConfiguredEndPoint &&
					!(preview.startPoint && preview.endPoint) ? (
						<div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
							Aun no tienes configurado un punto final de ruta en tu perfil.
						</div>
					) : null}

					{waypoints.length === 0 ? (
						<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
							No hay clientes asignados con coordenadas suficientes para pintar
							la ruta todavia.
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
