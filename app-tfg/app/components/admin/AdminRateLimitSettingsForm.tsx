"use client";

import { useEffect, useMemo, useState } from "react";
import PageTransition from "@/app/components/animations/PageTransition";
import AdminNotificationSettingsForm from "@/app/components/admin/AdminNotificationSettingsForm";
import SafeForm from "@/app/components/forms/SafeForm";
import SubmitButton from "@/app/components/forms/SubmitButton";
import H1Title from "@/app/components/H1Title";
import { requestJson } from "@/lib/api/client";
import type {
	RateLimitPolicySettingsItem,
	UpdateRateLimitPolicySettingsBody,
} from "@/lib/contracts/rate-limit-settings";

type DraftPolicy = {
	name: string;
	title: string;
	description: string;
	scope: string;
	enabled: boolean;
	maxRequests: string;
	windowMinutes: string;
	defaultEnabled: boolean;
	defaultMaxRequests: number;
	defaultWindowMinutes: number;
	message: string;
	isDefault: boolean;
};

function mapPolicyToDraft(policy: RateLimitPolicySettingsItem): DraftPolicy {
	return {
		name: policy.name,
		title: policy.title,
		description: policy.description,
		scope: policy.scope,
		enabled: policy.enabled,
		maxRequests: String(policy.maxRequests),
		windowMinutes: String(policy.windowMinutes),
		defaultEnabled: policy.defaultEnabled,
		defaultMaxRequests: policy.defaultMaxRequests,
		defaultWindowMinutes: policy.defaultWindowMinutes,
		message: policy.message,
		isDefault: policy.isDefault,
	};
}

export default function AdminRateLimitSettingsForm() {
	const [policies, setPolicies] = useState<RateLimitPolicySettingsItem[]>([]);
	const [draftPolicies, setDraftPolicies] = useState<DraftPolicy[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const hasChanges = useMemo(() => {
		if (policies.length !== draftPolicies.length) {
			return false;
		}

		return draftPolicies.some((draftPolicy, index) => {
			const policy = policies[index];

			return (
				draftPolicy.enabled !== policy.enabled ||
				Number(draftPolicy.maxRequests) !== policy.maxRequests ||
				Number(draftPolicy.windowMinutes) !== policy.windowMinutes
			);
		});
	}, [draftPolicies, policies]);
	const summary = useMemo(
		() => ({
			total: policies.length,
			active: policies.filter((policy) => policy.enabled).length,
			customized: policies.filter((policy) => policy.enabled && !policy.isDefault)
				.length,
			disabled: policies.filter((policy) => !policy.enabled).length,
		}),
		[policies],
	);

	useEffect(() => {
		let isCancelled = false;

		async function loadPolicies() {
			try {
				setLoading(true);
				setError("");

				const nextPolicies = await requestJson<RateLimitPolicySettingsItem[]>(
					"/api/admin/settings/rate-limits",
					{
						method: "GET",
						cache: "no-store",
						fallbackMessage:
							"No se pudo cargar la configuración de límites de peticiones",
					},
				);

				if (isCancelled) {
					return;
				}

				setPolicies(nextPolicies);
				setDraftPolicies(nextPolicies.map(mapPolicyToDraft));
			} catch (requestError) {
				if (!isCancelled) {
					setError(
						requestError instanceof Error
							? requestError.message
							: "No se pudo cargar la configuración de límites de peticiones",
					);
				}
			} finally {
				if (!isCancelled) {
					setLoading(false);
				}
			}
		}

		void loadPolicies();

		return () => {
			isCancelled = true;
		};
	}, []);

	function updateDraftPolicy(
		policyName: string,
		updates: Partial<Pick<DraftPolicy, "enabled" | "maxRequests" | "windowMinutes">>,
	) {
		setDraftPolicies((currentPolicies) =>
			currentPolicies.map((policy) =>
				policy.name === policyName ? { ...policy, ...updates } : policy,
			),
		);
	}

	function restoreDefaults(policyName: string) {
		setDraftPolicies((currentPolicies) =>
			currentPolicies.map((policy) =>
				policy.name === policyName
					? {
							...policy,
							enabled: policy.defaultEnabled,
							maxRequests: String(policy.defaultMaxRequests),
							windowMinutes: String(policy.defaultWindowMinutes),
						}
					: policy,
			),
		);
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		setError("");
		setSuccess("");

		const payload: UpdateRateLimitPolicySettingsBody = {
			policies: draftPolicies.map((policy) => ({
				name: policy.name,
				enabled: policy.enabled,
				maxRequests: policy.maxRequests,
				windowMinutes: policy.windowMinutes,
			})),
		};

		try {
			const nextPolicies = await requestJson<RateLimitPolicySettingsItem[]>(
				"/api/admin/settings/rate-limits",
				{
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(payload),
					fallbackMessage:
						"No se pudo guardar la configuración de límites de peticiones",
				},
			);

			setPolicies(nextPolicies);
			setDraftPolicies(nextPolicies.map(mapPolicyToDraft));
			setSuccess("Configuración de límites de peticiones guardada correctamente.");
		} catch (requestError) {
			setError(
				requestError instanceof Error
					? requestError.message
					: "No se pudo guardar la configuración de límites de peticiones",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<PageTransition>
			<div className="space-y-6">
				<H1Title
					title="Ajustes globales"
					subtitle="Configura notificaciones administrativas y límites operativos de autenticación y API."
				/>

				<AdminNotificationSettingsForm />

				<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
					<div className="space-y-3">
						<h2 className="text-xl font-semibold text-slate-900">
							Políticas disponibles
						</h2>
						<p className="text-sm text-slate-600">
							Cada política define cuantos intentos se permiten dentro de una
							ventana temporal. Si desactivas una, deja de aplicarse hasta que
							la vuelvas a activar.
						</p>
					</div>
				</section>

				{!loading ? (
					<section className="grid gap-4 md:grid-cols-4">
						<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
							<p className="text-sm text-slate-500">Políticas</p>
							<p className="mt-2 text-3xl font-semibold text-slate-900">
								{summary.total}
							</p>
						</div>
						<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
							<p className="text-sm text-slate-500">Activas</p>
							<p className="mt-2 text-3xl font-semibold text-emerald-700">
								{summary.active}
							</p>
						</div>
						<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
							<p className="text-sm text-slate-500">Personalizadas</p>
							<p className="mt-2 text-3xl font-semibold text-amber-700">
								{summary.customized}
							</p>
						</div>
						<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
							<p className="text-sm text-slate-500">Desactivadas</p>
							<p className="mt-2 text-3xl font-semibold text-rose-700">
								{summary.disabled}
							</p>
						</div>
					</section>
				) : null}

				{loading ? (
					<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
						<p className="text-sm text-slate-600">
							Cargando configuración de límites de peticiones...
						</p>
					</section>
				) : null}

				{!loading ? (
					<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
						<SafeForm onSubmit={handleSubmit} className="space-y-5">
							<div className="space-y-4">
								{draftPolicies.map((policy) => (
									<article
										key={policy.name}
										className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
									>
										<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
											<div className="space-y-2">
												<div className="flex flex-wrap items-center gap-2">
													<h3 className="text-lg font-semibold text-slate-900">
														{policy.title}
													</h3>
													<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
														{policy.scope}
													</span>
													{policy.isDefault ? (
														<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
															Valores por defecto
														</span>
													) : (
														<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
															Personalizada
														</span>
													)}
												</div>

												<p className="text-sm text-slate-600">
													{policy.description}
												</p>
												<p className="text-xs text-slate-500">
													Mensaje mostrado cuando bloquea: {policy.message}
												</p>
											</div>

											<button
												type="button"
												onClick={() => restoreDefaults(policy.name)}
												className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
											>
												Restaurar valores por defecto
											</button>
										</div>

										<div className="mt-5 grid gap-4 md:grid-cols-[180px_180px_minmax(0,1fr)]">
											<label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
												<input
													type="checkbox"
													checked={policy.enabled}
													onChange={(event) =>
														updateDraftPolicy(policy.name, {
															enabled: event.target.checked,
														})
													}
													className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
												/>
												<span className="text-sm text-slate-700">
													<span className="block font-medium text-slate-900">
														Política activa
													</span>
													Si la desactivas, no se aplica ningún bloqueo para
													este caso.
												</span>
											</label>

											<div>
												<label
													htmlFor={`max-requests-${policy.name}`}
													className="mb-2 block text-sm font-medium text-slate-700"
												>
													Máximo de intentos
												</label>
												<input
													id={`max-requests-${policy.name}`}
													type="number"
													min="1"
													step="1"
													value={policy.maxRequests}
													onChange={(event) =>
														updateDraftPolicy(policy.name, {
															maxRequests: event.target.value,
														})
													}
													className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
													required
												/>
											</div>

											<div>
												<label
													htmlFor={`window-minutes-${policy.name}`}
													className="mb-2 block text-sm font-medium text-slate-700"
												>
													Duracion de la ventana (min)
												</label>
												<input
													id={`window-minutes-${policy.name}`}
													type="number"
													min="1"
													step="1"
													value={policy.windowMinutes}
													onChange={(event) =>
														updateDraftPolicy(policy.name, {
															windowMinutes: event.target.value,
														})
													}
													className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
													required
												/>
												<p className="mt-2 text-xs text-slate-500">
													Por defecto: {policy.defaultMaxRequests} intentos en{" "}
													{policy.defaultWindowMinutes} min.
												</p>
											</div>
										</div>
									</article>
								))}
							</div>

							<div className="flex flex-wrap items-center gap-3">
								<SubmitButton
									isSubmitting={saving}
									submittingText="Guardando..."
									className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800"
								>
									Guardar ajustes
								</SubmitButton>

								{hasChanges ? (
									<p className="text-sm font-medium text-amber-700">
										Hay cambios sin guardar.
									</p>
								) : null}

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
