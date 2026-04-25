"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";
import EntityTableView from "@/app/components/entity-table/EntityTableView";
import SafeForm from "@/app/components/forms/SafeForm";
import SubmitButton from "@/app/components/forms/SubmitButton";
import type { CommercialRoutePreviewResponse } from "@/app/components/maps/route-map-types";
import type { CommercialClient } from "./commercial-client-types";
import type { CommercialVisit } from "./commercial-visit-types";
import {
	COMMERCIAL_VISIT_STATUS_OPTIONS,
	COMMERCIAL_VISIT_TYPE_OPTIONS,
} from "./commercial-visit-types";
import {
	mapCommercialVisitsToEntityTableItems,
	type VisitRouteMetadata,
} from "./commercial-visit-table-mappers";

type ApiErrorResponse = {
	error?: string;
	code?: string;
};

function getTodayDateInMadrid() {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/Madrid",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date());

	const year = parts.find((part) => part.type === "year")?.value ?? "1970";
	const month = parts.find((part) => part.type === "month")?.value ?? "01";
	const day = parts.find((part) => part.type === "day")?.value ?? "01";

	return `${year}-${month}-${day}`;
}

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

function sortVisitsForDisplay(
	visits: CommercialVisit[],
	routeMetadataByClientId: Map<string, VisitRouteMetadata>,
	todayDate: string,
	isTodayOnly: boolean,
) {
	return [...visits].sort((left, right) => {
		const leftIsToday = left.scheduled_for_date === todayDate;
		const rightIsToday = right.scheduled_for_date === todayDate;

		if (isTodayOnly && leftIsToday && rightIsToday) {
			const leftSequence =
				routeMetadataByClientId.get(left.client_id)?.sequence ??
				Number.MAX_SAFE_INTEGER;
			const rightSequence =
				routeMetadataByClientId.get(right.client_id)?.sequence ??
				Number.MAX_SAFE_INTEGER;

			if (leftSequence !== rightSequence) {
				return leftSequence - rightSequence;
			}
		}

		const dateComparison = left.scheduled_for_date.localeCompare(
			right.scheduled_for_date,
		);

		if (dateComparison !== 0) {
			return dateComparison;
		}

		return (left.client?.name ?? "").localeCompare(right.client?.name ?? "", "es", {
			sensitivity: "base",
		});
	});
}

export default function CommercialVisitsList() {
	const todayDate = useMemo(() => getTodayDateInMadrid(), []);

	const [visits, setVisits] = useState<CommercialVisit[]>([]);
	const [clients, setClients] = useState<CommercialClient[]>([]);
	const [routePreview, setRoutePreview] =
		useState<CommercialRoutePreviewResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [formError, setFormError] = useState("");
	const [formSuccess, setFormSuccess] = useState("");
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

	const [clientId, setClientId] = useState("");
	const [scheduledForDate, setScheduledForDate] = useState(todayDate);
	const [visitTypeId, setVisitTypeId] = useState("2");
	const [notes, setNotes] = useState("");

	const [filterClientId, setFilterClientId] = useState("");
	const [filterStatusId, setFilterStatusId] = useState("");
	const [filterVisitTypeId, setFilterVisitTypeId] = useState("");
	const [filterDateFrom, setFilterDateFrom] = useState(todayDate);
	const [filterDateTo, setFilterDateTo] = useState(todayDate);

	const isTodayOnly =
		filterDateFrom === todayDate && filterDateTo === todayDate && Boolean(todayDate);

	const routeMetadataByClientId = useMemo(
		() =>
			new Map(
				(routePreview?.waypoints ?? []).map((point) => [
					point.id,
					{
						sequence: point.sequence ?? null,
						estimatedArrivalTime: point.estimatedArrivalTime ?? null,
						isPastVisitWindow: point.isPastVisitWindow ?? false,
					},
				]),
			),
		[routePreview],
	);

	const sortedVisits = useMemo(
		() =>
			sortVisitsForDisplay(
				visits,
				routeMetadataByClientId,
				todayDate,
				isTodayOnly,
			),
		[visits, routeMetadataByClientId, todayDate, isTodayOnly],
	);

	const tableItems = useMemo(
		() =>
			mapCommercialVisitsToEntityTableItems(
				sortedVisits,
				routeMetadataByClientId,
			),
		[sortedVisits, routeMetadataByClientId],
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

	const loadClients = useCallback(async () => {
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
	}, []);

	const loadVisits = useCallback(async (filters?: {
		clientId?: string;
		statusId?: string;
		visitTypeId?: string;
		dateFrom?: string;
		dateTo?: string;
	}) => {
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
	}, [
		filterClientId,
		filterStatusId,
		filterVisitTypeId,
		filterDateFrom,
		filterDateTo,
	]);

	const loadRoutePreview = useCallback(async () => {
		const response = await fetch("/api/commercial/routes/preview", {
			method: "GET",
			cache: "no-store",
		});

		const data = (await response.json().catch(() => null)) as
			| CommercialRoutePreviewResponse
			| ApiErrorResponse
			| null;

		if (!response.ok) {
			throw new Error(
				data && typeof data === "object" && "error" in data && data.error
					? data.error
					: "No se pudo cargar el orden previsto de ruta",
			);
		}

		return data as CommercialRoutePreviewResponse;
	}, []);

	useEffect(() => {
		let ignore = false;

		async function loadClientsData() {
			try {
				const clientsData = await loadClients();

				if (!ignore) {
					setClients(clientsData);
				}
			} catch (err) {
				if (!ignore) {
					setError(
						err instanceof Error
							? err.message
							: "Error al cargar los clientes del comercial",
					);
				}
			}
		}

		void loadClientsData();

		return () => {
			ignore = true;
		};
	}, [loadClients]);

	useEffect(() => {
		let ignore = false;

		async function reloadVisitsAndRoute() {
			try {
				setLoading(true);
				setError("");

				const [visitsData, routePreviewData] = await Promise.all([
					loadVisits({
						clientId: filterClientId,
						statusId: filterStatusId,
						visitTypeId: filterVisitTypeId,
						dateFrom: filterDateFrom,
						dateTo: filterDateTo,
					}),
					loadRoutePreview(),
				]);

				if (!ignore) {
					setVisits(visitsData);
					setRoutePreview(routePreviewData);
				}
			} catch (err) {
				if (!ignore) {
					setError(
						err instanceof Error
							? err.message
							: "Error al cargar las visitas del comercial",
					);
				}
			} finally {
				if (!ignore) {
					setLoading(false);
				}
			}
		}

		void reloadVisitsAndRoute();

		return () => {
			ignore = true;
		};
	}, [
		loadRoutePreview,
		loadVisits,
		filterClientId,
		filterStatusId,
		filterVisitTypeId,
		filterDateFrom,
		filterDateTo,
	]);

	async function handleCreateVisit(event: React.FormEvent<HTMLFormElement>) {
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
			setScheduledForDate(todayDate);
			setVisitTypeId("2");
			setNotes("");
			setIsCreateModalOpen(false);
			setFormSuccess("Visita creada correctamente.");

			const [visitsData, routePreviewData] = await Promise.all([
				loadVisits({
					clientId: filterClientId,
					statusId: filterStatusId,
					visitTypeId: filterVisitTypeId,
					dateFrom: filterDateFrom,
					dateTo: filterDateTo,
				}),
				loadRoutePreview(),
			]);

			setVisits(visitsData);
			setRoutePreview(routePreviewData);
		} catch (err) {
			setFormError(
				err instanceof Error ? err.message : "Error al crear la visita",
			);
		} finally {
			setSaving(false);
		}
	}

	function openCreateModal() {
		setFormError("");
		setFormSuccess("");
		setScheduledForDate(
			filterDateFrom && filterDateFrom === filterDateTo ? filterDateFrom : todayDate,
		);
		setIsCreateModalOpen(true);
	}

	function closeCreateModal() {
		if (saving) {
			return;
		}

		setIsCreateModalOpen(false);
	}

	function handleClearFilters() {
		setFilterClientId("");
		setFilterStatusId("");
		setFilterVisitTypeId("");
		setFilterDateFrom(todayDate);
		setFilterDateTo(todayDate);
	}

	return (
		<PageTransition>
			<div className="space-y-6">
				<H1Title
					title="Visitas comerciales"
					subtitle="Planifica las visitas del dia y consultalas ya ordenadas segun la ruta prevista."
				/>

				{formSuccess ? (
					<div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
						{formSuccess}
					</div>
				) : null}

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

				<section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-md md:p-5">
					<div className="flex flex-wrap items-center justify-between gap-3">
						<div>
							<h2 className="text-base font-semibold text-slate-800">Filtros</h2>
							<p className="text-sm text-slate-500">
								Mostrando <strong>{tableItems.length}</strong> de{" "}
								<strong>{visits.length}</strong>. Por defecto se cargan las
								visitas de hoy.
							</p>
						</div>

						<div className="flex flex-wrap gap-2">
							<button
								type="button"
								onClick={handleClearFilters}
								className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-gray-50"
							>
								Limpiar filtros
							</button>
							<button
								type="button"
								onClick={openCreateModal}
								className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
							>
								Nueva visita
							</button>
						</div>
					</div>

					<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
						<div>
							<label className="mb-1 block text-sm font-semibold text-slate-700">
								Cliente
							</label>
							<select
								value={filterClientId}
								onChange={(event) => setFilterClientId(event.target.value)}
								className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-slate-500"
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
							<label className="mb-1 block text-sm font-semibold text-slate-700">
								Estado
							</label>
							<select
								value={filterStatusId}
								onChange={(event) => setFilterStatusId(event.target.value)}
								className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-slate-500"
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
							<label className="mb-1 block text-sm font-semibold text-slate-700">
								Tipo
							</label>
							<select
								value={filterVisitTypeId}
								onChange={(event) => setFilterVisitTypeId(event.target.value)}
								className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-slate-500"
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
							<label className="mb-1 block text-sm font-semibold text-slate-700">
								Desde
							</label>
							<input
								type="date"
								value={filterDateFrom}
								onChange={(event) => setFilterDateFrom(event.target.value)}
								className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-slate-500"
							/>
						</div>

						<div>
							<label className="mb-1 block text-sm font-semibold text-slate-700">
								Hasta
							</label>
							<input
								type="date"
								value={filterDateTo}
								onChange={(event) => setFilterDateTo(event.target.value)}
								className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-slate-500"
							/>
						</div>
					</div>

					<div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
						<span>
							Orden actual:{" "}
							<strong className="text-slate-700">
								{isTodayOnly ? "ruta prevista de hoy" : "fecha del listado"}
							</strong>
						</span>

						{routePreview?.timingSummary.pastWindowStopsCount ? (
							<span className="font-medium text-amber-700">
								Hay {routePreview.timingSummary.pastWindowStopsCount} parada
								{routePreview.timingSummary.pastWindowStopsCount === 1
									? ""
									: "s"}{" "}
								fuera de franja prevista.
							</span>
						) : null}
					</div>
				</section>

				{loading ? (
					<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
						Cargando visitas...
					</div>
				) : null}

				{!loading && error ? (
					<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
						{error}
					</div>
				) : null}

				{!loading && !error ? (
					<EntityTableView
						items={tableItems}
						emptyMessage="No hay visitas que coincidan con los filtros actuales."
					/>
				) : null}

				{isCreateModalOpen ? (
					<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
						<div className="w-full max-w-2xl rounded-[28px] border border-white/30 bg-white p-6 shadow-2xl">
							<div className="mb-5 flex items-start justify-between gap-4">
								<div>
									<h2 className="text-xl font-semibold text-slate-900">
										Crear visita
									</h2>
									<p className="mt-1 text-sm text-slate-600">
										La hora aproximada se recalculara despues con la ruta del
										dia.
									</p>
								</div>

								<button
									type="button"
									onClick={closeCreateModal}
									className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-gray-50"
								>
									Cerrar
								</button>
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
										onChange={(event) => setClientId(event.target.value)}
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
										onChange={(event) => setVisitTypeId(event.target.value)}
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
										required
									>
										{COMMERCIAL_VISIT_TYPE_OPTIONS.map((visitType) => (
											<option
												key={visitType.id}
												value={String(visitType.id)}
											>
												{visitType.label}
											</option>
										))}
									</select>
								</div>

								<div>
									<label className="mb-2 block text-sm font-medium text-slate-700">
										Dia de la visita
									</label>
									<input
										type="date"
										value={scheduledForDate}
										onChange={(event) =>
											setScheduledForDate(event.target.value)
										}
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
										onChange={(event) => setNotes(event.target.value)}
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

									{formError ? (
										<p className="text-sm font-medium text-red-600">
											{formError}
										</p>
									) : null}
								</div>
							</SafeForm>
						</div>
					</div>
				) : null}
			</div>
		</PageTransition>
	);
}
