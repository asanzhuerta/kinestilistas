"use client";

import { useEffect, useMemo, useState } from "react";
import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";
import EntityTable from "@/app/components/entity-table/EntityTable";
import SafeForm from "@/app/components/forms/SafeForm";
import SubmitButton from "@/app/components/forms/SubmitButton";
import type { CommercialClient } from "./commercial-client-types";
import type { CommercialVisit } from "./commercial-visit-types";
import {
	COMMERCIAL_VISIT_STATUS_OPTIONS,
	COMMERCIAL_VISIT_TYPE_OPTIONS,
	getVisitStatusLabel,
} from "./commercial-visit-types";
import { mapCommercialVisitsToEntityTableItems } from "./commercial-visit-table-mappers";

type ApiErrorResponse = {
	error?: string;
	code?: string;
};

function buildVisitsQuery(params: {
	clientId?: string;
	statusId?: string;
	visitTypeId?: string;
	dateFrom?: string;
	dateTo?: string;
}) {
	const searchParams = new URLSearchParams();

	if (params.clientId) {
		searchParams.set("clientId", params.clientId);
	}

	if (params.statusId) {
		searchParams.set("statusId", params.statusId);
	}

	if (params.visitTypeId) {
		searchParams.set("visitTypeId", params.visitTypeId);
	}

	if (params.dateFrom) {
		searchParams.set("dateFrom", params.dateFrom);
	}

	if (params.dateTo) {
		searchParams.set("dateTo", params.dateTo);
	}

	const query = searchParams.toString();

	return query ? `/api/commercial/visits?${query}` : "/api/commercial/visits";
}

export default function CommercialVisitsList() {
	const [visits, setVisits] = useState<CommercialVisit[]>([]);
	const [clients, setClients] = useState<CommercialClient[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [formError, setFormError] = useState("");
	const [formSuccess, setFormSuccess] = useState("");

	// --------------------------------------------------------------------------
	// Formulario de creación
	// --------------------------------------------------------------------------
	const [clientId, setClientId] = useState("");
	const [scheduledForDate, setScheduledForDate] = useState("");
	const [visitTypeId, setVisitTypeId] = useState("2");
	const [notes, setNotes] = useState("");

	// --------------------------------------------------------------------------
	// Filtros del listado
	// --------------------------------------------------------------------------
	const [filterClientId, setFilterClientId] = useState("");
	const [filterStatusId, setFilterStatusId] = useState("");
	const [filterVisitTypeId, setFilterVisitTypeId] = useState("");
	const [filterDateFrom, setFilterDateFrom] = useState("");
	const [filterDateTo, setFilterDateTo] = useState("");

	async function loadClients() {
		const response = await fetch("/api/commercial/clients", {
			method: "GET",
			cache: "no-store",
		});

		const data = (await response.json()) as
			| CommercialClient[]
			| ApiErrorResponse;

		if (!response.ok) {
			throw new Error(
				"error" in data && data.error
					? data.error
					: "No se pudieron obtener los clientes",
			);
		}

		return Array.isArray(data) ? data : [];
	}

	async function loadVisits(filters?: {
		clientId?: string;
		statusId?: string;
		visitTypeId?: string;
		dateFrom?: string;
		dateTo?: string;
	}) {
		const response = await fetch(
			buildVisitsQuery({
				clientId: filters?.clientId ?? filterClientId,
				statusId: filters?.statusId ?? filterStatusId,
				visitTypeId: filters?.visitTypeId ?? filterVisitTypeId,
				dateFrom: filters?.dateFrom ?? filterDateFrom,
				dateTo: filters?.dateTo ?? filterDateTo,
			}),
			{
				method: "GET",
				cache: "no-store",
			},
		);

		const data = (await response.json()) as
			| CommercialVisit[]
			| ApiErrorResponse;

		if (!response.ok) {
			throw new Error(
				"error" in data && data.error
					? data.error
					: "No se pudieron obtener las visitas",
			);
		}

		return Array.isArray(data) ? data : [];
	}

	async function loadData() {
		try {
			setLoading(true);
			setError("");

			const [visitsData, clientsData] = await Promise.all([
				loadVisits(),
				loadClients(),
			]);

			setVisits(visitsData);
			setClients(clientsData);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "Error al cargar las visitas",
			);
		} finally {
			setLoading(false);
		}
	}

	useEffect(() => {
		void loadData();
	}, []);

	useEffect(() => {
		let ignore = false;

		async function reloadVisitsByFilters() {
			try {
				setLoading(true);
				setError("");

				const visitsData = await loadVisits({
					clientId: filterClientId,
					statusId: filterStatusId,
					visitTypeId: filterVisitTypeId,
					dateFrom: filterDateFrom,
					dateTo: filterDateTo,
				});

				if (!ignore) {
					setVisits(visitsData);
				}
			} catch (err) {
				if (!ignore) {
					setError(
						err instanceof Error ? err.message : "Error al filtrar las visitas",
					);
				}
			} finally {
				if (!ignore) {
					setLoading(false);
				}
			}
		}

		void reloadVisitsByFilters();

		return () => {
			ignore = true;
		};
	}, [
		filterClientId,
		filterStatusId,
		filterVisitTypeId,
		filterDateFrom,
		filterDateTo,
	]);

	const tableItems = useMemo(
		() => mapCommercialVisitsToEntityTableItems(visits),
		[visits],
	);

	const stats = useMemo(() => {
		const planned = visits.filter((visit) => visit.status_id === 1).length;
		const completed = visits.filter((visit) => visit.status_id === 2).length;
		const cancelled = visits.filter((visit) => visit.status_id === 3).length;

		return {
			total: visits.length,
			planned,
			completed,
			cancelled,
		};
	}, [visits]);

	async function handleCreateVisit(event: React.FormEvent) {
		event.preventDefault();

		try {
			setSaving(true);
			setFormError("");
			setFormSuccess("");

			const response = await fetch("/api/commercial/visits", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					clientId,
					scheduledForDate,
					visitTypeId: Number(visitTypeId),
					notes,
				}),
			});

			const data = (await response.json()) as
				| ApiErrorResponse
				| CommercialVisit;

			if (!response.ok) {
				throw new Error(
					"error" in data && data.error
						? data.error
						: "No se pudo crear la visita",
				);
			}

			setClientId("");
			setScheduledForDate("");
			setVisitTypeId("2");
			setNotes("");
			setFormSuccess("Visita creada correctamente.");

			const refreshedVisits = await loadVisits({
				clientId: filterClientId,
				statusId: filterStatusId,
				visitTypeId: filterVisitTypeId,
				dateFrom: filterDateFrom,
				dateTo: filterDateTo,
			});

			setVisits(refreshedVisits);
		} catch (err) {
			setFormError(
				err instanceof Error ? err.message : "Error al crear la visita",
			);
		} finally {
			setSaving(false);
		}
	}

	function handleClearFilters() {
		setFilterClientId("");
		setFilterStatusId("");
		setFilterVisitTypeId("");
		setFilterDateFrom("");
		setFilterDateTo("");
	}

	return (
		<PageTransition>
			<div className="space-y-6">
				<H1Title
					title="Visitas comerciales"
					subtitle="Planifica las visitas por día y gestiona su seguimiento operativo."
				/>

				<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
					<div className="grid gap-4 md:grid-cols-4">
						<div className="rounded-2xl border border-slate-200 bg-white p-4">
							<p className="text-sm text-slate-500">Visitas mostradas</p>
							<p className="mt-1 text-2xl font-semibold text-slate-900">
								{stats.total}
							</p>
						</div>

						<div className="rounded-2xl border border-slate-200 bg-white p-4">
							<p className="text-sm text-slate-500">
								Clientes asignados disponibles
							</p>
							<p className="mt-1 text-2xl font-semibold text-slate-900">
								{clients.length}
							</p>
						</div>

						<div className="rounded-2xl border border-slate-200 bg-white p-4">
							<p className="text-sm text-slate-500">Planificadas</p>
							<p className="mt-1 text-2xl font-semibold text-amber-700">
								{stats.planned}
							</p>
						</div>

						<div className="rounded-2xl border border-slate-200 bg-white p-4">
							<p className="text-sm text-slate-500">Completadas</p>
							<p className="mt-1 text-2xl font-semibold text-emerald-700">
								{stats.completed}
							</p>
						</div>
					</div>
				</section>

				<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
					<div className="mb-5">
						<h2 className="text-lg font-semibold text-slate-900">
							Crear visita
						</h2>
						<p className="mt-1 text-sm text-slate-600">
							La visita queda planificada por día. La hora aproximada se
							calculará más adelante con la ruta.
						</p>
					</div>

					<SafeForm
						onSubmit={handleCreateVisit}
						className="grid gap-4 md:grid-cols-2"
					>
						<div>
							<label className="mb-2 block text-sm font-medium text-slate-700">
								Cliente
							</label>
							<select
								value={clientId}
								onChange={(e) => setClientId(e.target.value)}
								className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								required
							>
								<option value="">Selecciona un cliente</option>
								{clients.map((client) => (
									<option key={client.id} value={client.id}>
										{client.name}
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="mb-2 block text-sm font-medium text-slate-700">
								Tipo de visita
							</label>
							<select
								value={visitTypeId}
								onChange={(e) => setVisitTypeId(e.target.value)}
								className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								required
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
								Día de la visita
							</label>
							<input
								type="date"
								value={scheduledForDate}
								onChange={(e) => setScheduledForDate(e.target.value)}
								className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								required
							/>
						</div>

						<div className="md:col-span-2">
							<label className="mb-2 block text-sm font-medium text-slate-700">
								Notas
							</label>
							<textarea
								value={notes}
								onChange={(e) => setNotes(e.target.value)}
								rows={4}
								className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								placeholder="Objetivo de la visita, observaciones previas o puntos a revisar..."
							/>
						</div>

						<div className="md:col-span-2 flex flex-wrap items-center gap-3">
							<SubmitButton
								isSubmitting={saving}
								submittingText="Guardando..."
								className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
							>
								Crear visita
							</SubmitButton>

							{formSuccess ? (
								<p className="text-sm font-medium text-emerald-700">
									{formSuccess}
								</p>
							) : null}

							{formError ? (
								<p className="text-sm font-medium text-red-600">{formError}</p>
							) : null}
						</div>
					</SafeForm>
				</section>

				<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
					<div className="mb-5 flex flex-col gap-4">
						<div>
							<h2 className="text-lg font-semibold text-slate-900">
								Filtros del listado
							</h2>
							<p className="mt-1 text-sm text-slate-600">
								Filtra por cliente, estado, tipo y rango de días.
							</p>
						</div>

						<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									Cliente
								</label>
								<select
									value={filterClientId}
									onChange={(e) => setFilterClientId(e.target.value)}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								>
									<option value="">Todos los clientes</option>
									{clients.map((client) => (
										<option key={client.id} value={client.id}>
											{client.name}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									Estado
								</label>
								<select
									value={filterStatusId}
									onChange={(e) => setFilterStatusId(e.target.value)}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								>
									<option value="">Todos los estados</option>
									{COMMERCIAL_VISIT_STATUS_OPTIONS.map((status) => (
										<option key={status.id} value={String(status.id)}>
											{status.label}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									Tipo
								</label>
								<select
									value={filterVisitTypeId}
									onChange={(e) => setFilterVisitTypeId(e.target.value)}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								>
									<option value="">Todos los tipos</option>
									{COMMERCIAL_VISIT_TYPE_OPTIONS.map((visitType) => (
										<option key={visitType.id} value={String(visitType.id)}>
											{visitType.label}
										</option>
									))}
								</select>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									Desde
								</label>
								<input
									type="date"
									value={filterDateFrom}
									onChange={(e) => setFilterDateFrom(e.target.value)}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									Hasta
								</label>
								<input
									type="date"
									value={filterDateTo}
									onChange={(e) => setFilterDateTo(e.target.value)}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>
							</div>
						</div>

						<div className="flex flex-wrap items-center gap-3 text-sm">
							<button
								type="button"
								onClick={handleClearFilters}
								className="rounded-2xl border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 transition hover:bg-slate-50"
							>
								Limpiar filtros
							</button>

							<div className="text-slate-600">
								Estado actual:{" "}
								<span className="font-medium text-slate-900">
									{filterStatusId
										? getVisitStatusLabel(Number(filterStatusId))
										: "Todos"}
								</span>
							</div>
						</div>
					</div>
				</section>

				{loading ? (
					<section className="glass-card rounded-3xl border border-white/30 bg-white/70 p-6 shadow-xl backdrop-blur">
						<p className="text-sm text-slate-600">Cargando visitas...</p>
					</section>
				) : null}

				{!loading && error ? (
					<section className="glass-card rounded-3xl border border-red-200 bg-red-50/80 p-6 shadow-xl backdrop-blur">
						<h2 className="text-lg font-semibold text-red-700">
							No se pudieron cargar las visitas
						</h2>
						<p className="mt-2 text-sm text-red-600">{error}</p>
					</section>
				) : null}

				{!loading && !error ? (
					<EntityTable
						items={tableItems}
						config={{
							categoryLabel: "Provincia",
							statusLabel: "Estado",
							showImageFilter: true,
							emptyMessage:
								"No hay visitas que coincidan con los filtros actuales.",
						}}
					/>
				) : null}
			</div>
		</PageTransition>
	);
}
