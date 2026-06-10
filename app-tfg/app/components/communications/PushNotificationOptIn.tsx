"use client";

import { useEffect, useState } from "react";
import { ApiClientError, requestJson } from "@/lib/api/client";

type PushKeyResponse = {
	configured: boolean;
	publicKey: string | null;
};

type PushStatus =
	| "checking"
	| "unsupported"
	| "not_configured"
	| "available"
	| "enabled"
	| "denied";

type PushNotificationOptInProps = {
	variant?: "card" | "inline";
};

function getErrorMessage(error: unknown, fallback: string) {
	return error instanceof ApiClientError ? error.message : fallback;
}

function getStatusHelp(status: PushStatus) {
	if (status === "not_configured") {
		return "Falta la configuración del servidor para enviar push. Cuando estén definidas las claves VAPID, podrás activar este dispositivo.";
	}

	if (status === "unsupported") {
		return "Este navegador o esta conexión no permite notificaciones push. Prueba con HTTPS, localhost o la PWA instalada.";
	}

	if (status === "denied") {
		return "El permiso está bloqueado en este navegador. Cambia los permisos del sitio para poder volver a activarlo.";
	}

	return "";
}

function urlBase64ToUint8Array(base64String: string) {
	const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
	const base64 = `${base64String}${padding}`
		.replace(/-/g, "+")
		.replace(/_/g, "/");
	const rawData = window.atob(base64);
	const outputArray = new Uint8Array(rawData.length);

	for (let index = 0; index < rawData.length; index += 1) {
		outputArray[index] = rawData.charCodeAt(index);
	}

	return outputArray;
}

function isPushSupported() {
	return (
		typeof window !== "undefined" &&
		"isSecureContext" in window &&
		window.isSecureContext &&
		"Notification" in window &&
		"serviceWorker" in navigator &&
		"PushManager" in window
	);
}

export default function PushNotificationOptIn({
	variant = "card",
}: PushNotificationOptInProps) {
	const [status, setStatus] = useState<PushStatus>("checking");
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [pending, setPending] = useState(false);

	useEffect(() => {
		let mounted = true;

		async function loadStatus() {
			if (!isPushSupported()) {
				if (mounted) setStatus("unsupported");
				return;
			}

			if (Notification.permission === "denied") {
				if (mounted) setStatus("denied");
				return;
			}

			try {
				const keyResponse = await requestJson<PushKeyResponse>(
					"/api/communications/push-subscriptions/public-key",
					{ fallbackMessage: "No se pudo comprobar la configuración push" },
				);

				if (!keyResponse?.configured || !keyResponse.publicKey) {
					if (mounted) setStatus("not_configured");
					return;
				}

				const registration = await navigator.serviceWorker.ready;
				const subscription = await registration.pushManager.getSubscription();

				if (mounted) setStatus(subscription ? "enabled" : "available");
			} catch (error) {
				if (mounted) {
					setError(
						getErrorMessage(error, "No se pudo comprobar el estado push"),
					);
					setStatus("available");
				}
			}
		}

		void loadStatus();

		return () => {
			mounted = false;
		};
	}, []);

	async function enablePush() {
		setPending(true);
		setMessage("");
		setError("");

		try {
			const keyResponse = await requestJson<PushKeyResponse>(
				"/api/communications/push-subscriptions/public-key",
				{ fallbackMessage: "No se pudo obtener la clave push" },
			);

			if (!keyResponse?.configured || !keyResponse.publicKey) {
				setStatus("not_configured");
				return;
			}

			const permission = await Notification.requestPermission();

			if (permission !== "granted") {
				setStatus(permission === "denied" ? "denied" : "available");
				return;
			}

			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.subscribe({
				userVisibleOnly: true,
				applicationServerKey: urlBase64ToUint8Array(keyResponse.publicKey),
			});

			await requestJson("/api/communications/push-subscriptions", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(subscription.toJSON()),
				fallbackMessage: "No se pudo activar push",
			});

			setStatus("enabled");
			setMessage("Push activado en este dispositivo");
		} catch (error) {
			setError(getErrorMessage(error, "No se pudo activar push"));
		} finally {
			setPending(false);
		}
	}

	async function disablePush() {
		setPending(true);
		setMessage("");
		setError("");

		try {
			const registration = await navigator.serviceWorker.ready;
			const subscription = await registration.pushManager.getSubscription();
			const endpoint = subscription?.endpoint ?? null;

			if (subscription) {
				await subscription.unsubscribe();
			}

			await requestJson("/api/communications/push-subscriptions", {
				method: "DELETE",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ endpoint }),
				fallbackMessage: "No se pudo desactivar push",
			});

			setStatus("available");
			setMessage("Push desactivado en este dispositivo");
		} catch (error) {
			setError(getErrorMessage(error, "No se pudo desactivar push"));
		} finally {
			setPending(false);
		}
	}

	const statusLabel: Record<PushStatus, string> = {
		checking: "Comprobando",
		unsupported: "No disponible",
		not_configured: "Pendiente de configurar",
		available: "Disponible",
		enabled: "Activo",
		denied: "Bloqueado",
	};
	const statusHelp = getStatusHelp(status);
	const canEnablePush = status === "available";
	const showEnablePushButton =
		status === "checking" || status === "not_configured" || canEnablePush;

	if (variant === "inline") {
		return (
			<div className="flex flex-wrap items-center gap-2">
				<span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
					{status === "enabled"
						? "Notificaciónes activas"
						: `Push ${statusLabel[status]}`}
				</span>
				{showEnablePushButton ? (
					<button
						type="button"
						onClick={enablePush}
						disabled={pending || !canEnablePush}
						className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
					>
						Activar push
					</button>
				) : null}
				{status === "enabled" ? (
					<button
						type="button"
						onClick={disablePush}
						disabled={pending}
						className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
					>
						¿Desea desactivarlas?
					</button>
				) : null}
				{message ? (
					<span className="text-xs font-medium text-emerald-700">
						{message}
					</span>
				) : null}
				{error ? (
					<span className="text-xs font-medium text-rose-700">{error}</span>
				) : null}
				{statusHelp ? (
					<span className="max-w-md text-xs text-slate-500">{statusHelp}</span>
				) : null}
			</div>
		);
	}

	return (
		<section className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
						Push PWA
					</p>
					<h3 className="mt-1 text-lg font-semibold text-slate-900">
						Notificaciones del dispositivo
					</h3>
				</div>
				<span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
					{statusLabel[status]}
				</span>
			</div>

			<div className="mt-4 flex flex-wrap gap-2">
				{showEnablePushButton ? (
					<button
						type="button"
						onClick={enablePush}
						disabled={pending || !canEnablePush}
						className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
					>
						Activar notificaciones push
					</button>
				) : null}
				{status === "enabled" ? (
					<button
						type="button"
						onClick={disablePush}
						disabled={pending}
						className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
					>
						Desactivar notificaciones push
					</button>
				) : null}
			</div>

			{message ? (
				<p className="mt-3 text-sm text-emerald-700">{message}</p>
			) : null}
			{error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
			{statusHelp ? (
				<p className="mt-3 text-sm leading-6 text-slate-500">{statusHelp}</p>
			) : null}
		</section>
	);
}
