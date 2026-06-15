"use client";

import { useState } from "react";
import SafeForm from "@/app/components/forms/SafeForm";
import SubmitButton from "@/app/components/forms/SubmitButton";
import { requestJson } from "@/lib/api/client";
import type {
	ClientTierPolicySettings,
	ClientTierRecalculationResult,
	ClientTierRecalculationFrequency,
} from "@/lib/contracts/client-tier-settings";

type Props = {
	initialSettings: ClientTierPolicySettings;
};

export default function AdminClientTierPolicySettingsForm({
	initialSettings,
}: Props) {
	const [settings, setSettings] =
		useState<ClientTierPolicySettings>(initialSettings);
	const [saving, setSaving] = useState(false);
	const [recalculating, setRecalculating] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	function updateField<K extends keyof ClientTierPolicySettings>(
		field: K,
		value: ClientTierPolicySettings[K],
	) {
		setSettings((current) => ({
			...current,
			[field]: value,
		}));
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		setError("");
		setSuccess("");

		try {
			const nextSettings = await requestJson<ClientTierPolicySettings>(
				"/api/admin/settings/client-tiers",
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(settings),
					fallbackMessage: "No se pudo guardar la política de rangos",
				},
			);

			setSettings(nextSettings);
			setSuccess("Política de rangos guardada correctamente.");
		} catch (requestError) {
			setError(
				requestError instanceof Error
					? requestError.message
					: "No se pudo guardar la política de rangos",
			);
		} finally {
			setSaving(false);
		}
	}

	async function handleRecalculateNow() {
		setRecalculating(true);
		setError("");
		setSuccess("");

		try {
			const result = await requestJson<ClientTierRecalculationResult>(
				"/api/admin/settings/client-tiers/recalculate",
				{
					method: "POST",
					fallbackMessage: "No se pudo recalcular la política de rangos",
				},
			);

			setSuccess(
				`Rangos recalculados: ${result.updatedClients} clientes actualizados de ${result.processedClients}.`,
			);
		} catch (requestError) {
			setError(
				requestError instanceof Error
					? requestError.message
					: "No se pudo recalcular la política de rangos",
			);
		} finally {
			setRecalculating(false);
		}
	}

	return (
		<section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
			<SafeForm onSubmit={handleSubmit} className="space-y-4">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
							Rangos
						</p>
						<h2 className="mt-1 text-xl font-semibold text-slate-950">
							Umbrales de compra
						</h2>
						<p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
							Define el total comprado que se usará para reasignar Plata, Oro y
							Platino en el cierre configurado.
						</p>
					</div>

					<div className="flex flex-wrap gap-2">
						<button
							type="button"
							disabled={recalculating || saving}
							onClick={handleRecalculateNow}
							className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
						>
							{recalculating ? "Recalculando..." : "Recalcular ahora"}
						</button>
						<SubmitButton
							isSubmitting={saving}
							submittingText="Guardando..."
							className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
						>
							Guardar rangos
						</SubmitButton>
					</div>
				</div>

				<div className="grid gap-3 md:grid-cols-3">
					<label htmlFor="client-tier-threshold-silver" className="block">
						<span className="mb-2 block text-sm font-semibold text-slate-700">
							Umbral Plata
						</span>
						<input
							id="client-tier-threshold-silver"
							type="number"
							min="0"
							step="0.01"
							value={settings.thresholdSilver}
							onChange={(event) =>
								updateField("thresholdSilver", event.target.value)
							}
							className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						/>
					</label>
					<label htmlFor="client-tier-threshold-gold" className="block">
						<span className="mb-2 block text-sm font-semibold text-slate-700">
							Umbral Oro
						</span>
						<input
							id="client-tier-threshold-gold"
							type="number"
							min="0"
							step="0.01"
							value={settings.thresholdGold}
							onChange={(event) =>
								updateField("thresholdGold", event.target.value)
							}
							className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						/>
					</label>
					<label htmlFor="client-tier-threshold-platinum" className="block">
						<span className="mb-2 block text-sm font-semibold text-slate-700">
							Umbral Platino
						</span>
						<input
							id="client-tier-threshold-platinum"
							type="number"
							min="0"
							step="0.01"
							value={settings.thresholdPlatinum}
							onChange={(event) =>
								updateField("thresholdPlatinum", event.target.value)
							}
							className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						/>
					</label>
				</div>

				<div className="grid gap-3 md:grid-cols-3">
					<label htmlFor="client-tier-frequency" className="block">
						<span className="mb-2 block text-sm font-semibold text-slate-700">
							Periodicidad
						</span>
						<select
							id="client-tier-frequency"
							value={settings.recalculationFrequency}
							onChange={(event) =>
								updateField(
									"recalculationFrequency",
									event.target.value as ClientTierRecalculationFrequency,
								)
							}
							className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						>
							<option value="annual">Anual</option>
							<option value="monthly">Mensual</option>
						</select>
					</label>
					<label htmlFor="client-tier-recalculation-month" className="block">
						<span className="mb-2 block text-sm font-semibold text-slate-700">
							Mes
						</span>
						<input
							id="client-tier-recalculation-month"
							type="number"
							min="1"
							max="12"
							value={settings.recalculationMonth}
							disabled={settings.recalculationFrequency === "monthly"}
							onChange={(event) =>
								updateField("recalculationMonth", Number(event.target.value))
							}
							className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition disabled:bg-slate-100 disabled:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						/>
					</label>
					<label htmlFor="client-tier-recalculation-day" className="block">
						<span className="mb-2 block text-sm font-semibold text-slate-700">
							Día
						</span>
						<input
							id="client-tier-recalculation-day"
							type="number"
							min="1"
							max="31"
							value={settings.recalculationDay}
							onChange={(event) =>
								updateField("recalculationDay", Number(event.target.value))
							}
							className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						/>
					</label>
				</div>

				{error ? (
					<div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
						{error}
					</div>
				) : null}

				{success ? (
					<div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
						{success}
					</div>
				) : null}
			</SafeForm>
		</section>
	);
}
