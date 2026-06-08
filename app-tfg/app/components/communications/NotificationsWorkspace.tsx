"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import H1Title from "@/app/components/H1Title";
import { ApiClientError, requestJson } from "@/lib/api/client";
import type {
	NotificationView,
	ReminderView,
} from "./communication-view-types";
import PushNotificationOptIn from "./PushNotificationOptIn";

type Props = {
	title: string;
	subtitle: string;
	backHref: string;
	initialNotifications: NotificationView[];
	initialReminders: ReminderView[];
};

const emptyReminderForm = {
	title: "",
	body: "",
	scheduledAt: "",
};

function formatDateTime(value: string) {
	return new Intl.DateTimeFormat("es-ES", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	}).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
	return error instanceof ApiClientError ? error.message : fallback;
}

function getNotificationAction(
	notification: NotificationView,
	backHref: string,
) {
	const isCommercial = backHref === "/commercials";

	if (
		isCommercial &&
		[
			"commercial_visit_postponed",
			"commercial_visit_created",
			"commercial_visit_rescheduled",
			"commercial_visit_today",
		].includes(notification.sourceType ?? "") &&
		notification.sourceId
	) {
		return {
			href: `/commercials/visits/${notification.sourceId}`,
			label: "Abrir visita",
		};
	}

	if (
		isCommercial &&
		notification.sourceType === "commercial_visit_postponed_batch"
	) {
		return {
			href: "/commercials/visits",
			label: "Reubicar visitas",
		};
	}

	return null;
}

export default function NotificationsWorkspace({
	title,
	subtitle,
	backHref,
	initialNotifications,
	initialReminders,
}: Props) {
	const router = useRouter();
	const [notifications, setNotifications] = useState(initialNotifications);
	const [reminders, setReminders] = useState(initialReminders);
	const [reminderForm, setReminderForm] = useState(emptyReminderForm);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [pendingAction, setPendingAction] = useState<string | null>(null);

	useEffect(() => {
		setNotifications(initialNotifications);
		setReminders(initialReminders);
	}, [initialNotifications, initialReminders]);

	async function markAllRead() {
		setError("");
		setMessage("");
		setPendingAction("mark-all");

		try {
			await requestJson("/api/communications/notifications", {
				method: "PATCH",
				fallbackMessage: "No se pudieron marcar los avisos",
			});
			setMessage("Avisos marcados como leídos");
			router.refresh();
		} catch (error) {
			setError(getErrorMessage(error, "No se pudieron marcar los avisos"));
		} finally {
			setPendingAction(null);
		}
	}

	async function markOneRead(notificationId: string) {
		setError("");
		setMessage("");
		setPendingAction(`notification-${notificationId}`);

		try {
			await requestJson(`/api/communications/notifications/${notificationId}`, {
				method: "PATCH",
				fallbackMessage: "No se pudo marcar el aviso",
			});
			setMessage("Aviso marcado como leído");
			router.refresh();
		} catch (error) {
			setError(getErrorMessage(error, "No se pudo marcar el aviso"));
		} finally {
			setPendingAction(null);
		}
	}

	async function createReminder(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError("");
		setMessage("");
		setPendingAction("create-reminder");

		try {
			await requestJson("/api/communications/reminders", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(reminderForm),
				fallbackMessage: "No se pudo crear el recordatorio",
			});
			setReminderForm(emptyReminderForm);
			setMessage("Recordatorio creado");
			router.refresh();
		} catch (error) {
			setError(getErrorMessage(error, "No se pudo crear el recordatorio"));
		} finally {
			setPendingAction(null);
		}
	}

	async function updateReminderStatus(reminderId: string, status: string) {
		setError("");
		setMessage("");
		setPendingAction(`reminder-${reminderId}`);

		try {
			await requestJson(`/api/communications/reminders/${reminderId}`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ status }),
				fallbackMessage: "No se pudo actualizar el recordatorio",
			});
			setMessage("Recordatorio actualizado");
			router.refresh();
		} catch (error) {
			setError(getErrorMessage(error, "No se pudo actualizar el recordatorio"));
		} finally {
			setPendingAction(null);
		}
	}

	return (
			<div className="space-y-6">
				<H1Title title={title} subtitle={subtitle} />

			<section className="rounded-3xl border border-white/30 bg-white/70 p-6 shadow-xl backdrop-blur">
				<h2 className="text-2xl font-bold text-slate-900">
					Avisos y recordatorios
				</h2>
				<p className="mt-2 max-w-3xl text-sm text-slate-600">
					Consulta notificaciones internas y crea recordatorios personales para
					no perder acciones comerciales importantes.
				</p>
			</section>

			<PushNotificationOptIn />

			{message ? (
				<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
					{message}
				</div>
			) : null}

			{error ? (
				<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					{error}
				</div>
			) : null}

			<div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
				<section className="space-y-3 rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h3 className="text-lg font-semibold text-slate-900">Avisos</h3>
							<p className="text-sm text-slate-500">
								{notifications.filter((item) => !item.readAt).length} sin leer
							</p>
						</div>
						<button
							type="button"
							onClick={markAllRead}
							disabled={pendingAction === "mark-all"}
							className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-60"
						>
							Marcar todo
						</button>
					</div>

					{notifications.length ? (
						notifications.map((notification) => (
							<article
								key={notification.id}
								className={`rounded-2xl border p-4 ${
									notification.readAt
										? "border-slate-200 bg-slate-50"
										: "border-emerald-200 bg-emerald-50/60"
								}`}
							>
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div>
										<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
											{notification.notificationType}
										</p>
										<h4 className="mt-1 font-semibold text-slate-900">
											{notification.title}
										</h4>
									</div>
									<span className="text-xs text-slate-500">
										{formatDateTime(notification.createdAt)}
									</span>
								</div>
								<p className="mt-2 text-sm text-slate-600">
									{notification.body}
								</p>
								{getNotificationAction(notification, backHref) ? (
									<Link
										href={
											getNotificationAction(notification, backHref)?.href ??
											backHref
										}
										className="mt-3 inline-flex rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-700"
									>
										{getNotificationAction(notification, backHref)?.label}
									</Link>
								) : null}
								{!notification.readAt ? (
									<button
										type="button"
										onClick={() => markOneRead(notification.id)}
										disabled={
											pendingAction === `notification-${notification.id}`
										}
										className="mt-3 rounded-lg border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700 disabled:opacity-60"
									>
										Marcar leido
									</button>
								) : null}
							</article>
						))
					) : (
						<p className="rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-500">
							Sin avisos por ahora.
						</p>
					)}
				</section>

				<section className="space-y-4 rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
					<div>
						<h3 className="text-lg font-semibold text-slate-900">
							Recordatorios
						</h3>
						<p className="text-sm text-slate-500">
							Crea tareas personales ligadas al seguimiento comercial.
						</p>
					</div>

					<form onSubmit={createReminder} className="space-y-3">
						<input
							required
							placeholder="Titulo"
							value={reminderForm.title}
							onChange={(event) =>
								setReminderForm((current) => ({
									...current,
									title: event.target.value,
								}))
							}
							className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						/>
						<textarea
							required
							placeholder="Descripción"
							value={reminderForm.body}
							onChange={(event) =>
								setReminderForm((current) => ({
									...current,
									body: event.target.value,
								}))
							}
							className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						/>
						<input
							required
							type="datetime-local"
							value={reminderForm.scheduledAt}
							onChange={(event) =>
								setReminderForm((current) => ({
									...current,
									scheduledAt: event.target.value,
								}))
							}
							className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						/>
						<button
							type="submit"
							disabled={pendingAction === "create-reminder"}
							className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
						>
							Crear recordatorio
						</button>
					</form>

					<div className="space-y-3">
						{reminders.map((reminder) => (
							<article
								key={reminder.id}
								className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<h4 className="font-semibold text-slate-900">
											{reminder.title}
										</h4>
										<p className="mt-1 text-sm text-slate-600">
											{reminder.body}
										</p>
									</div>
									<span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
										{reminder.status}
									</span>
								</div>
								<p className="mt-2 text-xs text-slate-500">
									{formatDateTime(reminder.scheduledAt)}
								</p>
								<div className="mt-3 flex flex-wrap gap-2">
									<button
										type="button"
										onClick={() =>
											updateReminderStatus(reminder.id, "done")
										}
										disabled={pendingAction === `reminder-${reminder.id}`}
										className="rounded-lg border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700"
									>
										Hecho
									</button>
									<button
										type="button"
										onClick={() =>
											updateReminderStatus(reminder.id, "cancelled")
										}
										disabled={pendingAction === `reminder-${reminder.id}`}
										className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700"
									>
										Cancelar
									</button>
								</div>
							</article>
						))}
					</div>
				</section>
			</div>
		</div>
	);
}
