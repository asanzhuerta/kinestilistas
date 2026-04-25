"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import DataTable from "@/app/components/DataTable";
import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";
import SafeForm from "@/app/components/forms/SafeForm";
import SubmitButton from "@/app/components/forms/SubmitButton";
import {
	type CommercialVisit,
	COMMERCIAL_VISIT_STATUS_OPTIONS,
	COMMERCIAL_VISIT_TYPE_OPTIONS,
	formatVisitDate,
	getVisitStatusClasses,
	getVisitStatusLabel,
	getVisitTypeLabel,
} from "./commercial-visit-types";

type Props = {
	visitId: string;
};

type ApiErrorResponse = {
	error?: string;
	code?: string;
};

type InfoRow = {
	id: string;
	label: string;
	value: string;
};

type InfoColumn = {
	key: string;
	header: string;
	className?: string;
	render: (item: InfoRow) => ReactNode;
};

const infoColumns: InfoColumn[] = [
	{
		key: "label",
		header: "Campo",
		className: "w-1/3",
		render: (item) => item.label,
	},
	{
		key: "value",
		header: "Valor",
		render: (item) => item.value,
	},
];

export default function CommercialVisitDetail({ visitId }: Props) {
	const [visit, setVisit] = useState<CommercialVisit | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const [scheduledForDate, setScheduledForDate] = useState("");
	const [visitTypeId, setVisitTypeId] = useState("");
	const [statusId, setStatusId] = useState("");
	const [notes, setNotes] = useState("");
	const [result, setResult] = useState("");

	const loadVisit = useCallback(async () => {
		try {
			setLoading(true);
			setError("");

			const response = await fetch(`/api/commercial/visits/${visitId}`, {
				method: "GET",
				cache: "no-store",
			});

			const data = (await response.json()) as
				| CommercialVisit
				| ApiErrorResponse;

			if (!response.ok) {
				throw new Error(
					"error" in data && data.error
						? data.error
						: "No se pudo obtener la visita",
				);
			}

			const visitData = data as CommercialVisit;

			setVisit(visitData);
			setScheduledForDate(visitData.scheduled_for_date);
			setVisitTypeId(String(visitData.visit_type_id));
			setStatusId(String(visitData.status_id));
			setNotes(visitData.notes ?? "");
			setResult(visitData.result ?? "");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Error al cargar la visita",
			);
		} finally {
			setLoading(false);
		}
	}, [visitId]);

	useEffect(() => {
		void loadVisit();
	}, [loadVisit]);

	const canEditPlanning = useMemo(
		() => visit?.status_id === 1 || visit?.status_id === 4,
		[visit],
	);

	const visitRows = useMemo(() => {
		if (!visit) {
			return [];
		}

		return [
			{
				id: "status",
				label: "Estado",
				value: getVisitStatusLabel(visit.status_id),
			},
			{
				id: "visitType",
				label: "Tipo",
				value: getVisitTypeLabel(visit.visit_type_id),
			},
			{
				id: "scheduledForDate",
				label: "Día planificado",
				value: formatVisitDate(visit.scheduled_for_date),
			},
			{
				id: "notes",
				label: "Notas",
				value: visit.notes || "-",
			},
			{
				id: "result",
				label: "Resultado",
				value: visit.result || "-",
			},
		];
	}, [visit]);

	const clientRows = useMemo(() => {
		if (!visit) {
			return [];
		}

		return [
			{
				id: "clientName",
				label: "Cliente",
				value: visit.client?.name ?? "-",
			},
			{
				id: "contactName",
				label: "Contacto",
				value: visit.client?.contact_name || "-",
			},
			{
				id: "email",
				label: "Correo",
				value: visit.client?.user?.email || "-",
			},
			{
				id: "location",
				label: "Ubicación",
				value:
					[visit.client?.city, visit.client?.province]
						.filter(Boolean)
						.join(" · ") || "-",
			},
			{
				id: "visitWindow",
				label: "Horario de visitas",
				value:
					visit.client?.visit_window_start_time &&
					visit.client?.visit_window_end_time
						? `${visit.client.visit_window_start_time.slice(0, 5)} - ${visit.client.visit_window_end_time.slice(0, 5)}`
						: "-",
			},
		];
	}, [visit]);

	const commercialRows = useMemo(() => {
		if (!visit) {
			return [];
		}

		return [
			{
				id: "commercialName",
				label: "Comercial",
				value: visit.commercial?.user?.name ?? "-",
			},
			{
				id: "commercialEmail",
				label: "Correo",
				value: visit.commercial?.user?.email ?? "-",
			},
			{
				id: "employeeCode",
				label: "Código interno",
				value: visit.commercial?.employee_code ?? "-",
			},
			{
				id: "territory",
				label: "Territorio",
				value: visit.commercial?.territory ?? "-",
			},
		];
	}, [visit]);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();

		try {
			setSaving(true);
			setSuccess("");
			setError("");

			const response = await fetch(`/api/commercial/visits/${visitId}`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					scheduledForDate,
					visitTypeId: Number(visitTypeId),
					statusId: Number(statusId),
					notes,
					result,
				}),
			});

			const data = (await response.json()) as
				| CommercialVisit
				| ApiErrorResponse;

			if (!response.ok) {
				throw new Error(
					"error" in data && data.error
						? data.error
						: "No se pudo actualizar la visita",
				);
			}

			const visitData = data as CommercialVisit;

			setVisit(visitData);
			setScheduledForDate(visitData.scheduled_for_date);
			setVisitTypeId(String(visitData.visit_type_id));
			setStatusId(String(visitData.status_id));
			setNotes(visitData.notes ?? "");
			setResult(visitData.result ?? "");
			setSuccess("Visita actualizada correctamente.");
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Error al actualizar la visita",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<PageTransition>
			<div className="space-y-6">
				<div className="flex items-center justify-between gap-4">
					<H1Title
						title="Detalle de visita"
						subtitle="Consulta los datos de la visita y actualiza su estado."
					/>

					<Link
						href="/commercials/visits"
						className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
					>
						← Volver a visitas
					</Link>
				</div>

				{loading ? (
					<section className="glass-card rounded-3xl border border-white/30 bg-white/70 p-6 shadow-xl backdrop-blur">
						<p className="text-sm text-slate-600">Cargando visita...</p>
					</section>
				) : null}

				{!loading && error ? (
					<section className="glass-card rounded-3xl border border-red-200 bg-red-50/80 p-6 shadow-xl backdrop-blur">
						<h2 className="text-lg font-semibold text-red-700">
							No se pudo cargar la visita
						</h2>
						<p className="mt-2 text-sm text-red-600">{error}</p>
					</section>
				) : null}

				{!loading && !error && visit ? (
					<>
						<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
							<div className="flex flex-wrap items-center gap-3">
								<span
									className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${getVisitStatusClasses(
										visit.status_id,
									)}`}
								>
									{getVisitStatusLabel(visit.status_id)}
								</span>

								<span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
									{getVisitTypeLabel(visit.visit_type_id)}
								</span>
							</div>
						</section>

						<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
							<h2 className="mb-4 text-lg font-semibold text-slate-900">
								Información de la visita
							</h2>
							<DataTable<InfoRow>
								data={visitRows}
								columns={infoColumns}
								getRowKey={(item: InfoRow) => item.id}
								emptyMessage="No hay datos de la visita."
							/>
						</section>

						<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
							<h2 className="mb-4 text-lg font-semibold text-slate-900">
								Datos del cliente
							</h2>
							<DataTable<InfoRow>
								data={clientRows}
								columns={infoColumns}
								getRowKey={(item: InfoRow) => item.id}
								emptyMessage="No hay datos del cliente."
							/>
						</section>

						<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
							<h2 className="mb-4 text-lg font-semibold text-slate-900">
								Datos del comercial
							</h2>
							<DataTable<InfoRow>
								data={commercialRows}
								columns={infoColumns}
								getRowKey={(item: InfoRow) => item.id}
								emptyMessage="No hay datos del comercial."
							/>
						</section>

						<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
							<h2 className="text-lg font-semibold text-slate-900">
								Actualizar visita
							</h2>

							<p className="mt-1 text-sm text-slate-600">
								Mientras la visita siga planificada puedes cambiar el día y el
								tipo. El resultado es obligatorio al completarla.
							</p>

							<SafeForm
								onSubmit={handleSubmit}
								className="mt-5 grid gap-4 md:grid-cols-2"
							>
								<div>
									<label className="mb-2 block text-sm font-medium text-slate-700">
										Día de la visita
									</label>
									<input
										type="date"
										value={scheduledForDate}
										onChange={(e) => setScheduledForDate(e.target.value)}
										disabled={!canEditPlanning}
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
									/>
								</div>

								<div>
									<label className="mb-2 block text-sm font-medium text-slate-700">
										Tipo de visita
									</label>
									<select
										value={visitTypeId}
										onChange={(e) => setVisitTypeId(e.target.value)}
										disabled={!canEditPlanning}
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
									>
										{COMMERCIAL_VISIT_TYPE_OPTIONS.map((visitType) => (
											<option key={visitType.id} value={String(visitType.id)}>
												{visitType.label}
											</option>
										))}
									</select>
								</div>

								<div>
									<label className="mb-2 block text-sm font-medium text-slate-700">
										Estado
									</label>
									<select
										value={statusId}
										onChange={(e) => setStatusId(e.target.value)}
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									>
										{COMMERCIAL_VISIT_STATUS_OPTIONS.map((status) => (
											<option key={status.id} value={String(status.id)}>
												{status.label}
											</option>
										))}
									</select>
								</div>

								<div>
									<label className="mb-2 block text-sm font-medium text-slate-700">
										Notas
									</label>
									<textarea
										value={notes}
										onChange={(e) => setNotes(e.target.value)}
										rows={4}
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									/>
								</div>

								<div className="md:col-span-2">
									<label className="mb-2 block text-sm font-medium text-slate-700">
										Resultado
									</label>
									<textarea
										value={result}
										onChange={(e) => setResult(e.target.value)}
										rows={4}
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
										placeholder="Conclusiones de la visita, acuerdos alcanzados, próximos pasos..."
									/>
								</div>

								<div className="md:col-span-2 flex flex-wrap items-center gap-3">
									<SubmitButton
										isSubmitting={saving}
										submittingText="Guardando..."
										className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
									>
										Guardar cambios
									</SubmitButton>

									{success ? (
										<p className="text-sm font-medium text-emerald-700">
											{success}
										</p>
									) : null}
								</div>
							</SafeForm>
						</section>
					</>
				) : null}
			</div>
		</PageTransition>
	);
}
