"use client";

import { useEffect, useState } from "react";
import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";
import SafeForm from "@/app/components/forms/SafeForm";
import SubmitButton from "@/app/components/forms/SubmitButton";

type CommercialProfileResponse = {
	id: string;
	workday_start_time: string | null;
	workday_end_time: string | null;
	delivery_visit_duration_minutes: number;
	routine_visit_duration_minutes: number;
};

type ApiErrorResponse = {
	error?: string;
	code?: string;
};

function normalizeTimeForInput(value: string | null | undefined) {
	if (!value) {
		return "";
	}

	return value.slice(0, 5);
}

export default function CommercialSettingsForm() {
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const [workdayStartTime, setWorkdayStartTime] = useState("");
	const [workdayEndTime, setWorkdayEndTime] = useState("");
	const [deliveryVisitDurationMinutes, setDeliveryVisitDurationMinutes] =
		useState("10");
	const [routineVisitDurationMinutes, setRoutineVisitDurationMinutes] =
		useState("35");

	useEffect(() => {
		let ignore = false;

		async function loadCommercialSettings() {
			try {
				setLoading(true);
				setError("");

				const response = await fetch("/api/commercial/profile", {
					method: "GET",
					cache: "no-store",
				});

				const data = (await response.json().catch(() => null)) as
					| CommercialProfileResponse
					| ApiErrorResponse
					| null;

				if (!response.ok) {
					throw new Error(
						data && typeof data === "object" && "error" in data && data.error
							? data.error
							: "No se pudo cargar la configuración comercial",
					);
				}

				const commercial = data as CommercialProfileResponse;

				if (!ignore) {
					setWorkdayStartTime(
						normalizeTimeForInput(commercial.workday_start_time),
					);
					setWorkdayEndTime(normalizeTimeForInput(commercial.workday_end_time));
					setDeliveryVisitDurationMinutes(
						String(commercial.delivery_visit_duration_minutes ?? 10),
					);
					setRoutineVisitDurationMinutes(
						String(commercial.routine_visit_duration_minutes ?? 35),
					);
				}
			} catch (err) {
				if (!ignore) {
					setError(
						err instanceof Error
							? err.message
							: "Error al cargar la configuración comercial",
					);
				}
			} finally {
				if (!ignore) {
					setLoading(false);
				}
			}
		}

		void loadCommercialSettings();

		return () => {
			ignore = true;
		};
	}, []);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		try {
			setSaving(true);
			setError("");
			setSuccess("");

			const response = await fetch("/api/commercial/profile", {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					workdayStartTime: workdayStartTime || null,
					workdayEndTime: workdayEndTime || null,
					deliveryVisitDurationMinutes: Number(deliveryVisitDurationMinutes),
					routineVisitDurationMinutes: Number(routineVisitDurationMinutes),
				}),
			});

			const data = (await response.json().catch(() => null)) as
				| CommercialProfileResponse
				| ApiErrorResponse
				| null;

			if (!response.ok) {
				throw new Error(
					data && typeof data === "object" && "error" in data && data.error
						? data.error
						: "No se pudo guardar la configuración comercial",
				);
			}

			const commercial = data as CommercialProfileResponse;

			setWorkdayStartTime(normalizeTimeForInput(commercial.workday_start_time));
			setWorkdayEndTime(normalizeTimeForInput(commercial.workday_end_time));
			setDeliveryVisitDurationMinutes(
				String(commercial.delivery_visit_duration_minutes ?? 10),
			);
			setRoutineVisitDurationMinutes(
				String(commercial.routine_visit_duration_minutes ?? 35),
			);
			setSuccess("Configuración guardada correctamente.");
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Error al guardar la configuración comercial",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<PageTransition>
			<div className="space-y-6">
				<H1Title
					title="Ajustes comerciales"
					subtitle="Define la jornada base y los tiempos operativos que usará el módulo 2."
				/>

				<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
					<div className="max-w-3xl space-y-3">
						<h2 className="text-xl font-semibold text-slate-900">
							Planificación diaria
						</h2>
						<p className="text-sm text-slate-600">
							Esta configuración servirá como base para calcular el tiempo
							disponible en ruta según tu jornada habitual.
						</p>
					</div>
				</section>

				{loading ? (
					<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
						<p className="text-sm text-slate-600">
							Cargando configuración comercial...
						</p>
					</section>
				) : null}

				{!loading ? (
					<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
						<SafeForm
							onSubmit={handleSubmit}
							className="grid gap-4 md:grid-cols-2"
						>
							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									Inicio de jornada
								</label>
								<input
									type="time"
									value={workdayStartTime}
									onChange={(event) => setWorkdayStartTime(event.target.value)}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									Fin de jornada
								</label>
								<input
									type="time"
									value={workdayEndTime}
									onChange={(event) => setWorkdayEndTime(event.target.value)}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									Duración visita de reparto (min)
								</label>
								<input
									type="number"
									min="1"
									step="1"
									value={deliveryVisitDurationMinutes}
									onChange={(event) =>
										setDeliveryVisitDurationMinutes(event.target.value)
									}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									required
								/>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									Duración visita rutinaria (min)
								</label>
								<input
									type="number"
									min="1"
									step="1"
									value={routineVisitDurationMinutes}
									onChange={(event) =>
										setRoutineVisitDurationMinutes(event.target.value)
									}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									required
								/>
							</div>

							<div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
								El horario específico de cada peluquería se aplicará después
								sobre esta base diaria para decidir el encaje real de visitas.
							</div>

							<div className="md:col-span-2 flex flex-wrap items-center gap-3">
								<SubmitButton
									isSubmitting={saving}
									submittingText="Guardando..."
									className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
								>
									Guardar ajustes
								</SubmitButton>

								{success ? (
									<p className="text-sm font-medium text-emerald-700">
										{success}
									</p>
								) : null}

								{error ? (
									<p className="text-sm font-medium text-red-600">{error}</p>
								) : null}
							</div>
						</SafeForm>
					</section>
				) : null}
			</div>
		</PageTransition>
	);
}
