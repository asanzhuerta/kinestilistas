"use client";

import { useEffect, useMemo, useState } from "react";
import SafeForm from "@/app/components/forms/SafeForm";
import SubmitButton from "@/app/components/forms/SubmitButton";
import { requestJson } from "@/lib/api/client";
import type {
	ExternalNotificationDeliveryChannel,
	NotificationDeliverySettingsItem,
	UpdateNotificationDeliverySettingsBody,
} from "@/lib/contracts/notification-settings";

type DraftNotificationSetting = NotificationDeliverySettingsItem;

const CHANNEL_OPTIONS: Array<{
	value: ExternalNotificationDeliveryChannel;
	label: string;
	description: string;
}> = [
	{
		value: "push",
		label: "Push PWA",
		description: "Avisa al dispositivo si el usuario tiene permisos activos.",
	},
	{
		value: "email",
		label: "Email",
		description: "Envía un correo de apoyo cuando el evento se genera.",
	},
];

function cloneSetting(
	setting: NotificationDeliverySettingsItem,
): DraftNotificationSetting {
	return {
		...setting,
		channels: [...setting.channels],
		defaultChannels: [...setting.defaultChannels],
	};
}

function channelsAreEqual(
	left: ExternalNotificationDeliveryChannel[],
	right: ExternalNotificationDeliveryChannel[],
) {
	return (
		left.length === right.length &&
		left.every((channel, index) => channel === right[index])
	);
}

export default function AdminNotificationSettingsForm() {
	const [settings, setSettings] = useState<NotificationDeliverySettingsItem[]>(
		[],
	);
	const [draftSettings, setDraftSettings] = useState<DraftNotificationSetting[]>(
		[],
	);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const hasChanges = useMemo(() => {
		if (settings.length !== draftSettings.length) {
			return false;
		}

		return draftSettings.some((draftSetting, index) => {
			const setting = settings[index];
			return !channelsAreEqual(draftSetting.channels, setting.channels);
		});
	}, [draftSettings, settings]);

	useEffect(() => {
		let isCancelled = false;

		async function loadSettings() {
			try {
				setLoading(true);
				setError("");

				const nextSettings = await requestJson<
					NotificationDeliverySettingsItem[]
				>("/api/admin/settings/notifications", {
					method: "GET",
					cache: "no-store",
					fallbackMessage:
						"No se pudo cargar la configuración de avisos automáticos",
				});

				if (isCancelled) {
					return;
				}

				setSettings(nextSettings);
				setDraftSettings(nextSettings.map(cloneSetting));
			} catch (requestError) {
				if (!isCancelled) {
					setError(
						requestError instanceof Error
							? requestError.message
							: "No se pudo cargar la configuración de avisos automáticos",
					);
				}
			} finally {
				if (!isCancelled) {
					setLoading(false);
				}
			}
		}

		void loadSettings();

		return () => {
			isCancelled = true;
		};
	}, []);

	function updateChannels(
		key: string,
		channels: ExternalNotificationDeliveryChannel[],
	) {
		setDraftSettings((currentSettings) =>
			currentSettings.map((setting) =>
				setting.key === key ? { ...setting, channels } : setting,
			),
		);
	}

	function toggleChannel(
		key: string,
		channel: ExternalNotificationDeliveryChannel,
		enabled: boolean,
	) {
		const currentSetting = draftSettings.find((setting) => setting.key === key);

		if (!currentSetting) {
			return;
		}

		const nextChannels = new Set(currentSetting.channels);

		if (enabled) {
			nextChannels.add(channel);
		} else {
			nextChannels.delete(channel);
		}

		updateChannels(
			key,
			CHANNEL_OPTIONS.map((option) => option.value).filter((value) =>
				nextChannels.has(value),
			),
		);
	}

	function restoreDefaults(key: string) {
		const currentSetting = draftSettings.find((setting) => setting.key === key);

		if (!currentSetting) {
			return;
		}

		updateChannels(key, [...currentSetting.defaultChannels]);
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSaving(true);
		setError("");
		setSuccess("");

		const payload: UpdateNotificationDeliverySettingsBody = {
			events: draftSettings.map((setting) => ({
				key: setting.key,
				channels: setting.channels,
			})),
		};

		try {
			const nextSettings = await requestJson<
				NotificationDeliverySettingsItem[]
			>("/api/admin/settings/notifications", {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
				fallbackMessage:
					"No se pudo guardar la configuración de avisos automáticos",
			});

			setSettings(nextSettings);
			setDraftSettings(nextSettings.map(cloneSetting));
			setSuccess("Canales de avisos automáticos guardados correctamente.");
		} catch (requestError) {
			setError(
				requestError instanceof Error
					? requestError.message
					: "No se pudo guardar la configuración de avisos automáticos",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
				<div className="space-y-2">
					<p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-500">
						Avisos automáticos
					</p>
					<h2 className="text-xl font-semibold text-slate-900">
						Canales de notificación
					</h2>
					<p className="max-w-3xl text-sm text-slate-600">
						El aviso interno de la app se crea siempre. Desde aquí decides si
						cada evento automático también intenta llegar por Push PWA o email.
					</p>
				</div>
				<span className="w-fit rounded-full bg-emerald-100 px-4 py-2 text-xs font-semibold text-emerald-700">
					In-app siempre activo
				</span>
			</div>

			{loading ? (
				<p className="mt-5 text-sm text-slate-600">
					Cargando configuración de avisos automáticos...
				</p>
			) : null}

			{!loading ? (
				<SafeForm onSubmit={handleSubmit} className="mt-5 space-y-5">
					<div className="grid gap-4 xl:grid-cols-2">
						{draftSettings.map((setting) => (
							<article
								key={setting.key}
								className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
							>
								<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
									<div className="space-y-2">
										<div className="flex flex-wrap items-center gap-2">
											<h3 className="text-lg font-semibold text-slate-900">
												{setting.title}
											</h3>
											<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
												{setting.audience}
											</span>
											{setting.isDefault ? (
												<span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
													Por defecto
												</span>
											) : (
												<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
													Personalizado
												</span>
											)}
										</div>
										<p className="text-sm text-slate-600">
											{setting.description}
										</p>
									</div>

									<button
										type="button"
										onClick={() => restoreDefaults(setting.key)}
										className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
									>
										Restaurar
									</button>
								</div>

								<div className="mt-5 grid gap-3 sm:grid-cols-2">
									{CHANNEL_OPTIONS.map((option) => (
										<label
											key={option.value}
											className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
										>
											<input
												type="checkbox"
												checked={setting.channels.includes(option.value)}
												onChange={(event) =>
													toggleChannel(
														setting.key,
														option.value,
														event.target.checked,
													)
												}
												className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
											/>
											<span className="text-sm text-slate-700">
												<span className="block font-semibold text-slate-900">
													{option.label}
												</span>
												{option.description}
											</span>
										</label>
									))}
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
							Guardar canales
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
			) : null}
		</section>
	);
}
