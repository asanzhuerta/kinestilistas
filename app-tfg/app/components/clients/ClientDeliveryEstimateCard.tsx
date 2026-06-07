"use client";

import { useClientDeliveryEstimate } from "@/app/hooks/api/useClientDeliveryEstimate";
import type { DeliveryEstimateStatus } from "@/lib/contracts/delivery-estimate";
import { formatTimeLabel } from "@/lib/utils/time";

function getToneClasses(status: DeliveryEstimateStatus) {
	if (status === "outside_visit_window") {
		return "border-rose-200 bg-rose-50 text-rose-800";
	}

	if (status === "scheduled_without_eta") {
		return "border-amber-200 bg-amber-50 text-amber-800";
	}

	return "border-slate-200 bg-white text-slate-800";
}

export default function ClientDeliveryEstimateCard() {
	const { data: estimate, loading, error } = useClientDeliveryEstimate();

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

	if (
		estimate.status === "no_delivery_today" ||
		estimate.status === "no_active_commercial"
	) {
		return (
			<section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white/90 px-5 py-4 text-slate-800 shadow-sm">
				<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
					Reparto de hoy
				</p>
				<h2 className="mt-2 text-lg font-semibold">No hay reparto pendiente</h2>
				<p className="mt-1 text-sm text-slate-600">{estimate.message}</p>
			</section>
		);
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
