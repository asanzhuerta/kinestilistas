"use client";

import { useMemo, useState } from "react";
import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";
import SafeForm from "@/app/components/forms/SafeForm";
import SubmitButton from "@/app/components/forms/SubmitButton";
import { useCommercialProfile } from "@/app/hooks/api/useCommercialProfile";
import { normalizeTimeForInput } from "@/lib/utils/time";

type SettingsFormState = {
	workdayStartTime: string;
	workdayEndTime: string;
	deliveryVisitDurationMinutes: string;
	routineVisitDurationMinutes: string;
	routeStartAddress: string;
	routeEndAddress: string;
	returnToStart: boolean;
};

const DEFAULT_SETTINGS_FORM_STATE: SettingsFormState = {
	workdayStartTime: "",
	workdayEndTime: "",
	deliveryVisitDurationMinutes: "10",
	routineVisitDurationMinutes: "35",
	routeStartAddress: "",
	routeEndAddress: "",
	returnToStart: true,
};

export default function CommercialSettingsForm() {
	const { data, loading, error, save } = useCommercialProfile();
	const [saving, setSaving] = useState(false);
	const [success, setSuccess] = useState("");
	const [draftFormState, setDraftFormState] =
		useState<SettingsFormState | null>(null);

	const persistedFormState = useMemo<SettingsFormState>(() => {
		if (!data) {
			return DEFAULT_SETTINGS_FORM_STATE;
		}

		return {
			workdayStartTime: normalizeTimeForInput(data.workday_start_time),
			workdayEndTime: normalizeTimeForInput(data.workday_end_time),
			deliveryVisitDurationMinutes: String(
				data.delivery_visit_duration_minutes ?? 10,
			),
			routineVisitDurationMinutes: String(
				data.routine_visit_duration_minutes ?? 35,
			),
			routeStartAddress: data.route_start_address ?? "",
			routeEndAddress: data.route_end_address ?? "",
			returnToStart: data.return_to_start ?? true,
		};
	}, [data]);

	const formState = draftFormState ?? persistedFormState;

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		setSuccess("");

		const savedProfile = await save({
			workdayStartTime: formState.workdayStartTime || null,
			workdayEndTime: formState.workdayEndTime || null,
			deliveryVisitDurationMinutes: Number(
				formState.deliveryVisitDurationMinutes,
			),
			routineVisitDurationMinutes: Number(formState.routineVisitDurationMinutes),
			routeStartAddress: formState.routeStartAddress.trim() || null,
			routeEndAddress: formState.routeEndAddress.trim() || null,
			returnToStart: formState.returnToStart,
		});

		if (savedProfile) {
			setSuccess("Configuración guardada correctamente.");
			setDraftFormState(null);
		}

		setSaving(false);
	}

	return (
		<PageTransition>
			<div className="space-y-6">
				<H1Title
					title="Ajustes comerciales"
					subtitle="Define la jornada base y los tiempos operativos que usara el módulo 2."
				/>

				{loading ? (
					<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
						<p className="text-sm text-slate-600">
							Cargando configuración comercial...
						</p>
					</section>
				) : null}

				{!loading ? (
					<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
						<div className="mb-5">
							<h2 className="text-xl font-semibold text-slate-900">
								Planificación diaria
							</h2>
						</div>

						<SafeForm
							onSubmit={handleSubmit}
							className="grid gap-4 md:grid-cols-2"
						>
							<div>
								<label
									htmlFor="commercial-workday-start"
									className="mb-2 block text-sm font-medium text-slate-700"
								>
									Inicio de jornada
								</label>
								<input
									id="commercial-workday-start"
									type="time"
									value={formState.workdayStartTime}
									onChange={(event) =>
										setDraftFormState((currentState) => ({
											...(currentState ?? formState),
											workdayStartTime: event.target.value,
										}))
									}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>
							</div>

							<div>
								<label
									htmlFor="commercial-workday-end"
									className="mb-2 block text-sm font-medium text-slate-700"
								>
									Fin de jornada
								</label>
								<input
									id="commercial-workday-end"
									type="time"
									value={formState.workdayEndTime}
									onChange={(event) =>
										setDraftFormState((currentState) => ({
											...(currentState ?? formState),
											workdayEndTime: event.target.value,
										}))
									}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>
							</div>

							<div>
								<label
									htmlFor="commercial-delivery-visit-duration"
									className="mb-2 block text-sm font-medium text-slate-700"
								>
									Duracion visita de reparto (min)
								</label>
								<input
									id="commercial-delivery-visit-duration"
									type="number"
									min="1"
									step="1"
									value={formState.deliveryVisitDurationMinutes}
									onChange={(event) =>
										setDraftFormState((currentState) => ({
											...(currentState ?? formState),
											deliveryVisitDurationMinutes: event.target.value,
										}))
									}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									required
								/>
							</div>

							<div>
								<label
									htmlFor="commercial-routine-visit-duration"
									className="mb-2 block text-sm font-medium text-slate-700"
								>
									Duracion visita rutinaria (min)
								</label>
								<input
									id="commercial-routine-visit-duration"
									type="number"
									min="1"
									step="1"
									value={formState.routineVisitDurationMinutes}
									onChange={(event) =>
										setDraftFormState((currentState) => ({
											...(currentState ?? formState),
											routineVisitDurationMinutes: event.target.value,
										}))
									}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									required
								/>
							</div>

							<div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
								El horario especifico de cada peluqueria se aplicara después
								sobre esta base diaria para decidir el encaje real de visitas.
							</div>

							<div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
								<p className="text-sm font-semibold text-slate-900">
									Puntos de apoyo para la ruta
								</p>
								<p className="mt-1 text-sm text-slate-600">
									Si no se puede usar la ubicacion actual del dispositivo, el
									sistema recurrira al punto de salida guardado. Estas
									direcciones se geocodifican automáticamente al guardarlas.
								</p>
							</div>

							<div className="md:col-span-2">
								<label
									htmlFor="commercial-route-start-address"
									className="mb-2 block text-sm font-medium text-slate-700"
								>
									Punto de salida guardado
								</label>
								<input
									id="commercial-route-start-address"
									type="text"
									value={formState.routeStartAddress}
									onChange={(event) =>
										setDraftFormState((currentState) => ({
											...(currentState ?? formState),
											routeStartAddress: event.target.value,
										}))
									}
									placeholder="Ej. Calle de salida, ciudad"
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>
							</div>

							<div className="md:col-span-2 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4">
								<input
									id="commercial-return-to-start"
									type="checkbox"
									checked={formState.returnToStart}
									onChange={(event) =>
										setDraftFormState((currentState) => ({
											...(currentState ?? formState),
											returnToStart: event.target.checked,
										}))
									}
									className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
								/>
								<div>
									<label
										htmlFor="commercial-return-to-start"
										className="text-sm font-medium text-slate-800"
									>
										Finalizar la jornada volviendo al punto de salida
									</label>
									<p className="mt-1 text-sm text-slate-600">
										Si se desactiva esta opcion, se utilizara el punto final
										configurado mas abajo.
									</p>
								</div>
							</div>

							<div className="md:col-span-2">
								<label
									htmlFor="commercial-route-end-address"
									className="mb-2 block text-sm font-medium text-slate-700"
								>
									Punto final alternativo
								</label>
								<input
									id="commercial-route-end-address"
									type="text"
									value={formState.routeEndAddress}
									onChange={(event) =>
										setDraftFormState((currentState) => ({
											...(currentState ?? formState),
											routeEndAddress: event.target.value,
										}))
									}
									disabled={formState.returnToStart}
									placeholder="Ej. Almación, oficina o fin de jornada"
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
								/>
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
