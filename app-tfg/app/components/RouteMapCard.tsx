"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useCommercialRoutePreview } from "@/app/hooks/api/useCommercialRoutePreview";
import { buildGoogleMapsDirectionsUrl } from "@/app/components/maps/google-maps-url";
import type { RoutePoint } from "@/lib/contracts/commercial-route";
import { formatTimeLabel } from "@/lib/utils/time";

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
	compact?: boolean;
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

const EMPTY_ROUTE_POINTS: RoutePoint[] = [];

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

function buildCommittedTimeDescription(
	travelMinutes: number,
	waitingMinutes: number,
) {
	const parts = [`${formatMinutes(travelMinutes)} en trayectos`];

	if (waitingMinutes > 0) {
		parts.push(`${formatMinutes(waitingMinutes)} de espera`);
	}

	return parts.join(" / ");
}

function formatRouteMargin(
	hasValidWorkdayRange: boolean,
	overbookedMinutes: number | null,
	remainingOperationalMarginMinutes: number | null | undefined,
) {
	if (!hasValidWorkdayRange) {
		return "Pendiente";
	}

	if ((overbookedMinutes ?? 0) > 0) {
		return `${formatMinutes(overbookedMinutes)} exceso`;
	}

	return formatMinutes(remainingOperationalMarginMinutes);
}

function getRoutePreviewCoordinates(browserLocation: BrowserLocationState) {
	if (browserLocation.status !== "granted") {
		return undefined;
	}

	return {
		startLat: browserLocation.lat,
		startLng: browserLocation.lng,
	};
}

export default function RouteMapCard({
	title = "Ruta diaria",
	subtitle = "Vista previa de la ruta calculada con tus visitas planificadas para hoy",
	className = "",
	compact = false,
}: RouteMapCardProps) {
	const [browserLocation, setBrowserLocation] = useState<BrowserLocationState>({
		status: "loading",
	});

	useEffect(() => {
		if (!("geolocation" in navigator)) {
			const unavailableTimer = window.setTimeout(() => {
				setBrowserLocation({
					status: "unavailable",
					message: "Tu navegador no soporta geolocalización.",
				});
			}, 0);

			return () => window.clearTimeout(unavailableTimer);
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

	const coordinates = useMemo(
		() => getRoutePreviewCoordinates(browserLocation),
		[browserLocation],
	);

	const {
		data: preview,
		loading,
		error,
	} = useCommercialRoutePreview(coordinates, {
		enabled: browserLocation.status !== "loading",
	});

	const startPoint = preview?.startPoint ?? null;
	const endPoint = preview?.endPoint ?? null;
	const waypoints = preview?.waypoints ?? EMPTY_ROUTE_POINTS;
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
	const shouldShowLoading = browserLocation.status === "loading" || loading;

	if (compact) {
		return (
			<div
				className={`rounded-3xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}
			>
				<div className="mb-4 space-y-3">
					<h2 className="text-lg font-semibold text-slate-900">{title}</h2>

					<a
						href={googleMapsUrl}
						target="_blank"
						rel="noreferrer"
						className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
					>
						Abrir en Google Maps
					</a>
				</div>

				<div className="min-h-[20rem]">
					{shouldShowLoading ? (
						<div className="grid h-[20rem] place-items-center rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
							Cargando vista previa de la ruta...
						</div>
					) : null}

					{!shouldShowLoading && error ? (
						<div className="grid h-[20rem] place-items-center rounded-3xl border border-red-200 bg-red-50 px-4 py-4 text-center text-sm text-red-700">
							{error}
						</div>
					) : null}

					{!shouldShowLoading && !error && preview ? (
						<LeafletRouteMap
							startPoint={startPoint}
							waypoints={waypoints}
							endPoint={endPoint}
							heightClassName="h-[20rem] sm:h-[22rem]"
						/>
					) : null}
				</div>

				<p className="mt-4 text-sm text-slate-600">{subtitle}</p>

				{timingSummary ? (
					<div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium leading-5 text-slate-500 sm:text-sm">
						<span className="whitespace-nowrap">
							Visitas diarias{" "}
							<strong className="font-semibold text-slate-800">
								{timingSummary.plannedVisitsCount}
							</strong>
						</span>
						<span aria-hidden="true" className="text-slate-300">
							/
						</span>
						<span className="whitespace-nowrap">
							Visitas restantes{" "}
							<strong className="font-semibold text-slate-800">
								{waypoints.length}
							</strong>
						</span>
						<span aria-hidden="true" className="text-slate-300">
							/
						</span>
						<span className="whitespace-nowrap">
							Tiempo comprometido{" "}
							<strong className="font-semibold text-slate-800">
								{formatMinutes(timingSummary.totalCommittedRouteMinutes)}
							</strong>
						</span>
						<span aria-hidden="true" className="text-slate-300">
							/
						</span>
						<span className="whitespace-nowrap">
							Margen del día{" "}
							<strong className="font-semibold text-slate-800">
								{formatRouteMargin(
									hasValidWorkdayRange,
									overbookedMinutes,
									timingSummary.remainingOperationalMarginMinutes,
								)}
							</strong>
						</span>
					</div>
				) : null}
			</div>
		);
	}

	return (
		<div
			className={`rounded-3xl border border-slate-200 bg-white shadow-sm ${
				compact ? "p-4 lg:p-5" : "p-5"
			} ${className}`}
		>
			<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
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

			{shouldShowLoading ? (
				<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
					Cargando vista previa de la ruta...
				</div>
			) : null}

			{!shouldShowLoading && error ? (
				<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
					{error}
				</div>
			) : null}

			{!shouldShowLoading && !error && preview ? (
				<div
					className={
						compact
							? "grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(28rem,1.1fr)] xl:items-stretch"
							: "space-y-4"
					}
				>
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
							<div
								className={compact ? "grid gap-3" : "grid gap-3 md:grid-cols-3"}
							>
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
										? `${formatMinutes(timingSummary.totalWorkdayMinutes)} totales / ahora ${timingSummary.currentTimeLabel}`
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
									{timingSummary.deliveryVisitsCount} reparto /{" "}
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
									Margen del día
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
							Aún no has definido tu jornada base. Configúrala en{" "}
							<Link
								href="/commercials/settings"
								className="font-semibold underline underline-offset-2"
							>
								Ajustes
							</Link>{" "}
							para que el sistema calcule el tiempo máximo disponible en ruta.
							</div>
						) : null}

					{timingSummary && hasWorkdayConfig && !hasValidWorkdayRange ? (
						<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
							El horario base no es válido. Revisa en Ajustes que el fin de
							jornada sea posterior al inicio para poder calcular el margen de
							ruta.
						</div>
					) : null}

					{timingSummary &&
					hasValidWorkdayRange &&
					(overbookedMinutes ?? 0) > 0 ? (
						<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
							La planificación actual supera la jornada disponible desde este
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
						</div>

					<div
						className={
							compact
								? "min-h-[22rem] sm:min-h-[24rem] xl:h-full xl:min-h-[18rem]"
								: ""
						}
					>
						{hasEnoughPointsForMap ? (
							<LeafletRouteMap
								startPoint={startPoint}
								waypoints={waypoints}
								endPoint={endPoint}
								heightClassName={
									compact
										? "h-[22rem] sm:h-[24rem] xl:h-full"
										: undefined
								}
							/>
						) : null}
					</div>
				</div>
			) : null}
		</div>
	);
}
