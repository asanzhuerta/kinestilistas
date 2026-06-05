"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import H1Title from "@/app/components/H1Title";
import { ApiClientError, requestJson } from "@/lib/api/client";
import type { TrainingEventView } from "./communication-view-types";

type Props = {
	title: string;
	subtitle: string;
	backHref: string;
	initialTrainings: TrainingEventView[];
};

const dateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
	day: "2-digit",
	month: "short",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});

function formatDateTime(value: string) {
	return dateTimeFormatter.format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
	return error instanceof ApiClientError ? error.message : fallback;
}

function getEnrollmentStatus(training: TrainingEventView) {
	return training.currentUserEnrollment?.status ?? null;
}

export default function TrainingEventsWorkspace({
	title,
	subtitle,
	backHref,
	initialTrainings,
}: Props) {
	const router = useRouter();
	const [trainings, setTrainings] = useState(initialTrainings);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [pendingId, setPendingId] = useState<string | null>(null);

	useEffect(() => {
		setTrainings(initialTrainings);
	}, [initialTrainings]);

	async function enroll(trainingId: string) {
		setError("");
		setMessage("");
		setPendingId(trainingId);

		try {
			await requestJson(`/api/communications/trainings/${trainingId}/enrollment`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({}),
				fallbackMessage: "No se pudo completar la inscripcion",
			});
			setMessage("Inscripcion registrada correctamente");
			router.refresh();
		} catch (error) {
			setError(getErrorMessage(error, "No se pudo completar la inscripcion"));
		} finally {
			setPendingId(null);
		}
	}

	async function cancel(trainingId: string) {
		setError("");
		setMessage("");
		setPendingId(trainingId);

		try {
			await requestJson(`/api/communications/trainings/${trainingId}/enrollment`, {
				method: "DELETE",
				fallbackMessage: "No se pudo cancelar la inscripcion",
			});
			setMessage("Inscripcion cancelada");
			router.refresh();
		} catch (error) {
			setError(getErrorMessage(error, "No se pudo cancelar la inscripcion"));
		} finally {
			setPendingId(null);
		}
	}

	return (
		<div className="space-y-6">
			<H1Title title={title} subtitle={subtitle} />

			<div className="flex justify-start">
				<Link
					href={backHref}
					className="rounded-xl border border-slate-200 bg-white/75 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
				>
					Volver
				</Link>
			</div>

			<section className="rounded-3xl border border-white/30 bg-white/70 p-6 shadow-xl backdrop-blur">
				<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
					M6 / Formacion
				</p>
				<h2 className="mt-2 text-2xl font-bold text-slate-900">
					Sesiones publicadas
				</h2>
				<p className="mt-2 max-w-3xl text-sm text-slate-600">
					Inscribete en formaciones disponibles o cancela tu plaza si no puedes
					asistir. La capacidad se valida en servidor.
				</p>
			</section>

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

			{trainings.length ? (
				<div className="grid gap-4 md:grid-cols-2">
					{trainings.map((training) => {
						const enrollmentStatus = getEnrollmentStatus(training);
						const isRegistered = enrollmentStatus === "registered";

						return (
							<article
								key={training.id}
								className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm"
							>
								<div className="flex flex-wrap items-start justify-between gap-3">
									<div>
										<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
											{training.modality}
										</p>
										<h3 className="mt-1 text-lg font-semibold text-slate-900">
											{training.title}
										</h3>
									</div>
									<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
										{isRegistered ? "Inscrito" : "Disponible"}
									</span>
								</div>
								<p className="mt-3 text-sm text-slate-600">
									{training.description}
								</p>
								{training.content ? (
									<p className="mt-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
										{training.content}
									</p>
								) : null}
								<p className="mt-3 text-xs text-slate-500">
									{formatDateTime(training.startsAt)}
									{training.location ? ` · ${training.location}` : ""}
									{training.capacity ? ` · ${training.capacity} plazas` : ""}
								</p>
								<div className="mt-4">
									{isRegistered ? (
										<button
											type="button"
											onClick={() => cancel(training.id)}
											disabled={pendingId === training.id}
											className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-medium text-rose-700 disabled:opacity-60"
										>
											Cancelar inscripcion
										</button>
									) : (
										<button
											type="button"
											onClick={() => enroll(training.id)}
											disabled={pendingId === training.id}
											className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
										>
											Inscribirme
										</button>
									)}
								</div>
							</article>
						);
					})}
				</div>
			) : (
				<div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
					No hay formaciones publicadas ahora mismo.
				</div>
			)}
		</div>
	);
}
