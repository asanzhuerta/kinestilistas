"use client";

import { useEffect, useState } from "react";

type DeliveryEstimateResponse = {
	status:
		| "scheduled"
		| "outside_visit_window"
		| "scheduled_without_eta"
		| "no_delivery_today"
		| "no_active_commercial";
	date: string;
	message: string;
	estimatedArrivalTime: string | null;
	sequence: number | null;
	windowStartTime: string | null;
	windowEndTime: string | null;
	commercialName: string | null;
};

type ApiError = {
	error?: string;
};

function formatTimeLabel(value: string | null | undefined) {
	if (!value) {
		return "--:--";
	}

	return value.slice(0, 5);
}

function getToneClasses(status: DeliveryEstimateResponse["status"]) {
	if (status === "outside_visit_window") {
		return "border-rose-200 bg-rose-50 text-rose-800";
	}

	if (status === "scheduled_without_eta") {
		return "border-amber-200 bg-amber-50 text-amber-800";
	}

	return "border-slate-200 bg-white text-slate-800";
}

export default function ClientDeliveryEstimateCard() {
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");
	const [estimate, setEstimate] = useState<DeliveryEstimateResponse | null>(null);

	useEffect(() => {
		let ignore = false;

		async function loadEstimate() {
			try {
				setLoading(true);
				setError("");

				const response = await fetch("/api/clients/delivery-estimate", {
					method: "GET",
					cache: "no-store",
				});

				const data = (await response.json().catch(() => null)) as
					| DeliveryEstimateResponse
					| ApiError
					| null;

				if (!response.ok) {
					throw new Error(
						data && typeof data === "object" && "error" in data && data.error
							? data.error
							: "No se pudo cargar la hora aproximada de reparto",
					);
				}

				if (!ignore) {
					setEstimate(data as DeliveryEstimateResponse);
				}
			} catch (err) {
				if (!ignore) {
					setError(
						err instanceof Error
							? err.message
							: "Error al cargar la hora aproximada de reparto",
					);
				}
			} finally {
				if (!ignore) {
					setLoading(false);
				}
			}
		}

		void loadEstimate();

		return () => {
			ignore = true;
		};
	}, []);

	if (loading) {
		return (
			<section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
				<p className="text-sm text-slate-600">
					Calculando la hora aproximada de reparto de hoy...
				</p>
			</section>
		);
	}

	if (error) {
		return (
			<section className="rounded-[28px] border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm">
				{error}
			</section>
		);
	}

	if (!estimate) {
		return null;
	}

	return (
		<section
			className={`rounded-[28px] border p-5 shadow-sm ${getToneClasses(estimate.status)}`}
		>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<p className="text-sm font-medium uppercase tracking-wide opacity-75">
						Reparto de hoy
					</p>
					<h2 className="mt-1 text-xl font-semibold">Tu hora aproximada</h2>
					<p className="mt-2 text-sm opacity-90">{estimate.message}</p>
				</div>

				<div className="rounded-3xl bg-white/80 px-5 py-4 text-center shadow-sm">
					<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
						Llegada estimada
					</p>
					<p className="mt-2 text-3xl font-semibold text-slate-900">
						{formatTimeLabel(estimate.estimatedArrivalTime)}
					</p>
					<p className="mt-1 text-sm text-slate-600">
						{estimate.sequence
							? `Parada #${estimate.sequence}`
							: "Pendiente de ruta"}
					</p>
				</div>
			</div>

			<div className="mt-4 grid gap-3 sm:grid-cols-3">
				<div className="rounded-2xl border border-white/70 bg-white/70 p-4">
					<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
						Franja de visita
					</p>
					<p className="mt-2 text-base font-semibold text-slate-900">
						{estimate.windowStartTime && estimate.windowEndTime
							? `${formatTimeLabel(estimate.windowStartTime)} - ${formatTimeLabel(estimate.windowEndTime)}`
							: "Sin definir"}
					</p>
				</div>

				<div className="rounded-2xl border border-white/70 bg-white/70 p-4">
					<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
						Comercial asignado
					</p>
					<p className="mt-2 text-base font-semibold text-slate-900">
						{estimate.commercialName || "Sin asignar"}
					</p>
				</div>

				<div className="rounded-2xl border border-white/70 bg-white/70 p-4">
					<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
						Estado
					</p>
					<p className="mt-2 text-base font-semibold text-slate-900">
						{estimate.status === "scheduled"
							? "En ruta"
							: estimate.status === "outside_visit_window"
								? "Fuera de franja"
								: estimate.status === "scheduled_without_eta"
									? "Sin ETA exacta"
									: estimate.status === "no_delivery_today"
										? "Sin reparto hoy"
										: "Pendiente"}
					</p>
				</div>
			</div>
		</section>
	);
}
