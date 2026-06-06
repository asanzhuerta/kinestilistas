"use client";

import Link from "next/link";
import { useState } from "react";
import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";
import type { ApiErrorResponse } from "@/lib/contracts/api";
import type { SalonClientSummary } from "@/lib/contracts/salon";
import { formatDateShort } from "@/lib/utils/user-utils";
import { getApiErrorMessage } from "./salon-ui";

type Props = {
	initialSalonClients: SalonClientSummary[];
};

const inputClassName =
	"w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400";

const textareaClassName = `${inputClassName} min-h-28 resize-y`;

export default function SalonClientsWorkspace({
	initialSalonClients,
}: Props) {
	const [salonClients, setSalonClients] =
		useState<SalonClientSummary[]>(initialSalonClients);
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [email, setEmail] = useState("");
	const [notes, setNotes] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setFeedback(null);
		setIsSubmitting(true);

		try {
			const response = await fetch("/api/clients/salon-clients", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name,
					phone,
					email,
					notes,
				}),
			});
			const data = (await response.json().catch(() => null)) as
				| SalonClientSummary
				| ApiErrorResponse
				| null;

			if (!response.ok || !data || !("id" in data)) {
				setFeedback({
					type: "error",
					message: getApiErrorMessage(
						data as ApiErrorResponse | null,
						"No se ha podido crear la ficha tecnica.",
					),
				});
				return;
			}

			setSalonClients((current) => [data, ...current]);
			setName("");
			setPhone("");
			setEmail("");
			setNotes("");
			setFeedback({
				type: "success",
				message: "Ficha tecnica creada correctamente.",
			});
		} catch {
			setFeedback({
				type: "error",
				message: "No se ha podido crear la ficha tecnica.",
			});
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<PageTransition>
			<H1Title
				title="Fichas tecnicas"
				subtitle="Gestiona clientes, historial tecnico, plantillas y seguimiento de servicios"
			/>

			<div className="mb-4 flex items-center gap-3">
				<Link
					href="/clients"
					className="inline-flex items-center rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white"
				>
					Volver al panel
				</Link>
			</div>

			<div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
				<section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
					<h2 className="text-lg font-semibold text-slate-900">
						Nueva ficha tecnica
					</h2>
					<p className="mt-1 text-sm text-slate-500">
						Da de alta a un cliente del salon para empezar a registrar
						servicios.
					</p>

					<form className="mt-5 space-y-4" onSubmit={handleSubmit}>
						<div>
							<label
								htmlFor="salon-client-name"
								className="mb-2 block text-sm font-medium text-slate-700"
							>
								Nombre
							</label>
							<input
								id="salon-client-name"
								name="name"
								value={name}
								onChange={(event) => setName(event.target.value)}
								className={inputClassName}
								placeholder="Nombre del cliente"
								autoComplete="name"
								disabled={isSubmitting}
							/>
						</div>

						<div>
							<label
								htmlFor="salon-client-phone"
								className="mb-2 block text-sm font-medium text-slate-700"
							>
								Teléfono
							</label>
							<input
								id="salon-client-phone"
								name="phone"
								type="tel"
								value={phone}
								onChange={(event) => setPhone(event.target.value)}
								className={inputClassName}
								placeholder="Teléfono de contacto"
								autoComplete="tel"
								disabled={isSubmitting}
							/>
						</div>

						<div>
							<label
								htmlFor="salon-client-email"
								className="mb-2 block text-sm font-medium text-slate-700"
							>
								Correo
							</label>
							<input
								id="salon-client-email"
								name="email"
								type="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								className={inputClassName}
								placeholder="correo@ejemplo.com"
								autoComplete="email"
								disabled={isSubmitting}
							/>
						</div>

						<div>
							<label
								htmlFor="salon-client-notes"
								className="mb-2 block text-sm font-medium text-slate-700"
							>
								Notas generales
							</label>
							<textarea
								id="salon-client-notes"
								name="notes"
								value={notes}
								onChange={(event) => setNotes(event.target.value)}
								className={textareaClassName}
								placeholder="Alergias, preferencias, contexto del historial..."
								disabled={isSubmitting}
							/>
						</div>

						{feedback ? (
							<div
								className={`rounded-2xl px-4 py-3 text-sm ${
									feedback.type === "success"
										? "bg-emerald-50 text-emerald-700"
										: "bg-rose-50 text-rose-700"
								}`}
							>
								{feedback.message}
							</div>
						) : null}

						<button
							type="submit"
							disabled={isSubmitting}
							className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
						>
							{isSubmitting ? "Creando..." : "Crear ficha"}
						</button>
					</form>
				</section>

				<section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
					<div className="mb-5 flex items-center justify-between gap-3">
						<div>
							<h2 className="text-lg font-semibold text-slate-900">
								Clientes registrados
							</h2>
							<p className="mt-1 text-sm text-slate-500">
								Abre cada ficha para anadir servicios y revisar su historial.
							</p>
						</div>
						<span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
							{salonClients.length}
						</span>
					</div>

					{salonClients.length === 0 ? (
						<div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
							Aun no hay fichas tecnicas registradas para este salon.
						</div>
					) : (
						<div className="space-y-4">
							{salonClients.map((salonClient) => (
								<Link
									key={salonClient.id}
									href={`/clients/salon-clients/${salonClient.id}`}
									className="block rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-slate-300 hover:bg-white"
								>
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<h3 className="text-lg font-semibold text-slate-900">
												{salonClient.name}
											</h3>
											<p className="mt-1 text-sm text-slate-500">
												{salonClient.phone || "Sin telefono"} ·{" "}
												{salonClient.email || "Sin correo"}
											</p>
										</div>

										<span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white">
											Ver ficha
										</span>
									</div>

									<div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
										<div className="rounded-2xl bg-white px-4 py-3">
											<p className="text-xs uppercase tracking-[0.18em] text-slate-400">
												Servicios
											</p>
											<p className="mt-1 text-base font-semibold text-slate-900">
												{salonClient.service_count}
											</p>
										</div>
										<div className="rounded-2xl bg-white px-4 py-3">
											<p className="text-xs uppercase tracking-[0.18em] text-slate-400">
												Ultimo servicio
											</p>
											<p className="mt-1 text-base font-semibold text-slate-900">
												{salonClient.last_service_at
													? formatDateShort(salonClient.last_service_at)
													: "Sin historial"}
											</p>
										</div>
									</div>

									{salonClient.notes ? (
										<p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">
											{salonClient.notes}
										</p>
									) : null}
								</Link>
							))}
						</div>
					)}
				</section>
			</div>
		</PageTransition>
	);
}
