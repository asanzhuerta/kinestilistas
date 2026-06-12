"use client";

import { useState } from "react";
import SafeForm from "@/app/components/forms/SafeForm";
import SubmitButton from "@/app/components/forms/SubmitButton";
import { requestJson } from "@/lib/api/client";
import type { OrderBusinessSettings } from "@/lib/contracts/order-settings";

type Props = {
	initialSettings: OrderBusinessSettings;
};

export default function AdminOrderBusinessSettingsForm({
	initialSettings,
}: Props) {
	const [agencyDeliveryFee, setAgencyDeliveryFee] = useState(
		initialSettings.agencyDeliveryFee,
	);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		setError("");
		setSuccess("");

		try {
			const settings = await requestJson<OrderBusinessSettings>(
				"/api/admin/settings/orders",
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						agencyDeliveryFee,
					}),
					fallbackMessage: "No se pudo guardar el cargo por agencia",
				},
			);

			setAgencyDeliveryFee(settings.agencyDeliveryFee);
			setSuccess("Ajustes de pedidos guardados correctamente.");
		} catch (requestError) {
			setError(
				requestError instanceof Error
					? requestError.message
					: "No se pudo guardar el cargo por agencia",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
			<SafeForm onSubmit={handleSubmit} className="space-y-4">
				<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto] lg:items-end">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
							Pedidos
						</p>
						<h2 className="mt-1 text-xl font-semibold text-slate-950">
							Cargo por agencia
						</h2>
						<p className="mt-2 text-sm leading-6 text-slate-600">
							Importe que se suma automaticamente cuando el cliente elige
							entrega por agencia.
						</p>
					</div>

					<div>
						<label
							htmlFor="agency-delivery-fee"
							className="mb-2 block text-sm font-semibold text-slate-700"
						>
							Importe
						</label>
						<input
							id="agency-delivery-fee"
							type="number"
							min="0"
							step="0.01"
							value={agencyDeliveryFee}
							onChange={(event) => setAgencyDeliveryFee(event.target.value)}
							className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
						/>
					</div>

					<SubmitButton
						isSubmitting={saving}
						submittingText="Guardando..."
						className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
					>
						Guardar cargo
					</SubmitButton>
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
