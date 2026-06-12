"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";
import EntityTableView from "@/app/components/entity-table/EntityTableView";
import SafeForm from "@/app/components/forms/SafeForm";
import SubmitButton from "@/app/components/forms/SubmitButton";
import { useSessionStorageState } from "@/app/hooks/useSessionStorageState";
import { requestJson } from "@/lib/api/client";
import type { CommercialRoutePreviewResponse } from "@/lib/contracts/commercial-route";
import type { OrderDeliverySummary } from "@/lib/contracts/order";
import { getTodayDateInMadrid } from "@/lib/utils/time";
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

function buildPendingDeliveriesQuery() {
	const searchParams = new URLSearchParams();
	searchParams.set("status", "prepared");
	searchParams.set("fulfillmentMethod", "commercial");

	return `/api/commercial/order-deliveries?${searchParams.toString()}`;
}

const DELIVERY_VISIT_TYPE_ID = "1";

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
	const [pendingDeliveries, setPendingDeliveries] = useState<
		OrderDeliverySummary[]
	>([]);
	const [routePreview, setRoutePreview] =
		useState<CommercialRoutePreviewResponse | null>(null);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [formError, setFormError] = useState("");
	const [formSuccess, setFormSuccess] = useState("");
	const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const [isFiltersOpen, setIsFiltersOpen] = useState(false);

	const [clientId, setClientId] = useState("");
	const [scheduledForDate, setScheduledForDate] = useState(todayDate);
	const [visitTypeId, setVisitTypeId] = useState("2");
	const [notes, setNotes] = useState("");
	const [selectedDeliveryIds, setSelectedDeliveryIds] = useState<string[]>([]);

	const [filterClientId, setFilterClientId] = useSessionStorageState(
		"commercial-visits:filter-client-id",
		"",
	);
	const [filterStatusId, setFilterStatusId] = useSessionStorageState(
		"commercial-visits:filter-status-id",
		"",
	);
	const [filterVisitTypeId, setFilterVisitTypeId] = useSessionStorageState(
		"commercial-visits:filter-visit-type-id",
		"",
	);
	const [filterDateFrom, setFilterDateFrom] = useSessionStorageState(
		"commercial-visits:filter-date-from",
		todayDate,
	);
	const [filterDateTo, setFilterDateTo] = useSessionStorageState(
		"commercial-visits:filter-date-to",
		todayDate,
	);

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

	const pendingDeliveriesByClient = useMemo(() => {
		const grouped = new Map<
			string,
			{
				clientId: string;
				clientName: string;
				clientContactName: string | null;
				deliveries: OrderDeliverySummary[];
				totalPackages: number;
			}
		>();

		for (const delivery of pendingDeliveries) {
			const current = grouped.get(delivery.client_id) ?? {
				clientId: delivery.client_id,
				clientName: delivery.client_name,
				clientContactName: delivery.client_contact_name ?? null,
				deliveries: [],
				totalPackages: 0,
			};

			current.deliveries.push(delivery);
			current.totalPackages += Number(delivery.package_count ?? 0);
			grouped.set(delivery.client_id, current);
		}

		return Array.from(grouped.values()).sort((left, right) =>
			left.clientName.localeCompare(right.clientName, "es", {
				sensitivity: "base",
			}),
		);
	}, [pendingDeliveries]);

	const pendingDeliveriesForSelectedClient = useMemo(
		() =>
			pendingDeliveries.filter((delivery) => delivery.client_id === clientId),
		[pendingDeliveries, clientId],
	);

	const stats = useMemo(() => {
		const planned = visits.filter((visit) => visit.status_id === 1).length;
		const completed = visits.filter((visit) => visit.status_id === 2).length;

		return {
			planned,
			completed,
			pendingDeliveries: pendingDeliveries.length,
		};
	}, [pendingDeliveries.length, visits]);

	const loadClients = useCallback(async () => {
		const data = await requestJson<CommercialClient[]>("/api/commercial/clients", {
			method: "GET",
			cache: "no-store",
			fallbackMessage: "No se pudieron obtener los clientes",
		});

		return Array.isArray(data) ? data : [];
	}, []);

	const loadVisits = useCallback(async (filters?: {
		clientId?: string;
		statusId?: string;
		visitTypeId?: string;
		dateFrom?: string;
		dateTo?: string;
	}) => {
		const data = await requestJson<CommercialVisit[]>(
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
				fallbackMessage: "No se pudieron obtener las visitas",
			},
		);

		return Array.isArray(data) ? data : [];
	}, [
		filterClientId,
		filterStatusId,
		filterVisitTypeId,
		filterDateFrom,
		filterDateTo,
	]);

	const loadRoutePreview = useCallback(async () => {
		return requestJson<CommercialRoutePreviewResponse>(
			"/api/commercial/routes/preview",
			{
				method: "GET",
				cache: "no-store",
				fallbackMessage: "No se pudo cargar el orden previsto de ruta",
			},
		);
	}, []);

	const loadPendingDeliveries = useCallback(async () => {
		const data = await requestJson<OrderDeliverySummary[]>(
			buildPendingDeliveriesQuery(),
			{
				method: "GET",
				cache: "no-store",
				fallbackMessage:
					"No se pudieron obtener los repartos preparados pendientes de visita",
			},
		);

		return Array.isArray(data) ? data : [];
	}, []);

	useEffect(() => {
		setIsMounted(true);

		return () => {
			setIsMounted(false);
		};
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
		if (visitTypeId !== DELIVERY_VISIT_TYPE_ID) {
			return;
		}

		const allowedOrderIds = new Set(
			pendingDeliveriesForSelectedClient.map((delivery) => delivery.id),
		);

		setSelectedDeliveryIds((current) => {
			const next = current.filter((orderId) => allowedOrderIds.has(orderId));
			return next.length === current.length ? current : next;
		});
	}, [pendingDeliveriesForSelectedClient, visitTypeId]);

	useEffect(() => {
		let ignore = false;

		async function reloadVisitsAndRoute() {
			try {
				setLoading(true);
				setError("");

				const [visitsData, routePreviewData, pendingDeliveriesData] =
					await Promise.all([
					loadVisits({
						clientId: filterClientId,
						statusId: filterStatusId,
						visitTypeId: filterVisitTypeId,
						dateFrom: filterDateFrom,
						dateTo: filterDateTo,
					}),
					loadRoutePreview(),
					loadPendingDeliveries(),
				]);

				if (!ignore) {
					setVisits(visitsData);
					setRoutePreview(routePreviewData);
					setPendingDeliveries(pendingDeliveriesData);
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
		loadPendingDeliveries,
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

			if (
				visitTypeId === DELIVERY_VISIT_TYPE_ID &&
				selectedDeliveryIds.length === 0
			) {
				setFormError(
					"Selecciona al menos un reparto preparado antes de crear una visita de reparto.",
				);
				return;
			}

			await requestJson<CommercialVisit>("/api/commercial/visits", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					clientId,
					scheduledForDate,
					visitTypeId: Number(visitTypeId),
					notes,
					deliveryIds:
						visitTypeId === DELIVERY_VISIT_TYPE_ID ? selectedDeliveryIds : [],
				}),
				fallbackMessage: "No se pudo crear la visita",
			});

			setClientId("");
			setScheduledForDate(todayDate);
			setVisitTypeId("2");
			setNotes("");
			setSelectedDeliveryIds([]);
			setIsCreateModalOpen(false);
			setFormSuccess("Visita creada correctamente.");

			const [visitsData, routePreviewData, pendingDeliveriesData] =
				await Promise.all([
				loadVisits({
					clientId: filterClientId,
					statusId: filterStatusId,
					visitTypeId: filterVisitTypeId,
					dateFrom: filterDateFrom,
					dateTo: filterDateTo,
				}),
				loadRoutePreview(),
				loadPendingDeliveries(),
			]);

			setVisits(visitsData);
			setRoutePreview(routePreviewData);
			setPendingDeliveries(pendingDeliveriesData);
		} catch (err) {
			setFormError(
				err instanceof Error ? err.message : "Error al crear la visita",
			);
		} finally {
			setSaving(false);
		}
	}

	function openCreateModal(input?: {
		clientId?: string;
		visitTypeId?: string;
		deliveryIds?: string[];
	}) {
		setFormError("");
		setFormSuccess("");
		const nextVisitTypeId = input?.visitTypeId ?? "2";
		setClientId(input?.clientId ?? "");
		setScheduledForDate(
			filterDateFrom && filterDateFrom === filterDateTo ? filterDateFrom : todayDate,
		);
		setVisitTypeId(nextVisitTypeId);
		setNotes("");
		setSelectedDeliveryIds(
			nextVisitTypeId === DELIVERY_VISIT_TYPE_ID
				? Array.from(new Set(input?.deliveryIds ?? []))
				: [],
		);
		setIsCreateModalOpen(true);
	}

	function closeCreateModal() {
		if (saving) {
			return;
		}

		setIsCreateModalOpen(false);
	}

	function handleCreateVisitClientChange(nextClientId: string) {
		setClientId(nextClientId);

		if (visitTypeId !== DELIVERY_VISIT_TYPE_ID) {
			return;
		}

		const allowedOrderIds = new Set(
			pendingDeliveries
				.filter((delivery) => delivery.client_id === nextClientId)
				.map((delivery) => delivery.id),
		);

		setSelectedDeliveryIds((current) =>
			current.filter((orderId) => allowedOrderIds.has(orderId)),
		);
	}

	function handleCreateVisitTypeChange(nextVisitTypeId: string) {
		setVisitTypeId(nextVisitTypeId);

		if (nextVisitTypeId !== DELIVERY_VISIT_TYPE_ID) {
			setSelectedDeliveryIds([]);
			return;
		}

		const allowedOrderIds = new Set(
			pendingDeliveries
				.filter((delivery) => delivery.client_id === clientId)
				.map((delivery) => delivery.id),
		);

		setSelectedDeliveryIds((current) =>
			current.filter((orderId) => allowedOrderIds.has(orderId)),
		);
	}

	function toggleSelectedDelivery(deliveryId: string) {
		setSelectedDeliveryIds((current) =>
			current.includes(deliveryId)
				? current.filter((currentDeliveryId) => currentDeliveryId !== deliveryId)
				: [...current, deliveryId],
		);
	}

	function handleClearFilters() {
		setFilterClientId("");
		setFilterStatusId("");
		setFilterVisitTypeId("");
		setFilterDateFrom(todayDate);
		setFilterDateTo(todayDate);
	}

	return (
		<>
			<PageTransition>
				<div className="space-y-6">
				<H1Title
					title="Visitas comerciales"
					subtitle="Planifica las visitas del día y consultalas ya ordenadas según la ruta prevista."
				/>

				{formSuccess ? (
					<div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
						{formSuccess}
					</div>
				) : null}

				<section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<h2 className="text-sm font-semibold text-slate-800">
								Resumen de visitas
							</h2>
							<p className="text-xs text-slate-500">
								Estado operativo de las visitas filtradas.
							</p>
						</div>

						<div className="grid gap-2 sm:grid-cols-3">
							<div className="rounded-xl bg-amber-50 px-3 py-2">
								<p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">
									Planificadas
								</p>
								<p className="text-lg font-semibold text-amber-700">
									{stats.planned}
								</p>
							</div>

							<div className="rounded-xl bg-emerald-50 px-3 py-2">
								<p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
									Completadas
								</p>
								<p className="text-lg font-semibold text-emerald-700">
									{stats.completed}
								</p>
							</div>

							<div className="rounded-xl bg-sky-50 px-3 py-2">
								<p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
									Repartos preparados
								</p>
								<p className="text-lg font-semibold text-sky-700">
									{stats.pendingDeliveries}
								</p>
							</div>
						</div>
					</div>
				</section>

				{pendingDeliveriesByClient.length > 0 ? (
					<section className="rounded-2xl border border-sky-100 bg-sky-50/70 p-5 shadow-sm">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<h2 className="text-base font-semibold text-slate-800">
									Repartos preparados sin visita asignada
								</h2>
								<p className="text-sm text-slate-600">
									Usa esta bandeja para planificar visitas de entrega con
									repartos ya preparados.
								</p>
							</div>

							<button
								type="button"
								onClick={() =>
									openCreateModal({
										visitTypeId: DELIVERY_VISIT_TYPE_ID,
									})
								}
								className="rounded-xl border border-sky-200 bg-white px-4 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
							>
								Crear visita de reparto
							</button>
						</div>

						<div className="mt-4 grid gap-4 xl:grid-cols-2">
							{pendingDeliveriesByClient.map((group) => (
								<article
									key={group.clientId}
									className="rounded-2xl border border-sky-100 bg-white p-4 shadow-sm"
								>
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<h3 className="text-base font-semibold text-slate-900">
												{group.clientName}
											</h3>
											<p className="text-sm text-slate-500">
												{group.clientContactName
													? `Contacto: ${group.clientContactName}`
													: "Cliente sin contacto principal indicado"}
											</p>
										</div>

										<div className="text-right text-sm text-slate-600">
											<p>
												<strong className="text-slate-900">
													{group.deliveries.length}
												</strong>{" "}
												reparto{group.deliveries.length === 1 ? "" : "s"}
											</p>
											<p className="font-medium text-slate-900">
												{group.totalPackages} bulto
												{group.totalPackages === 1 ? "" : "s"}
											</p>
										</div>
									</div>

									<div className="mt-4 space-y-3">
										{group.deliveries.map((delivery) => (
											<div
												key={delivery.id}
												className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
											>
												<div className="flex flex-wrap items-center justify-between gap-2">
													<div>
														<p className="text-sm font-semibold text-slate-900">
															Reparto {delivery.id.slice(0, 8)} · Pedido{" "}
															{delivery.order_short_id} ·{" "}
															{new Intl.DateTimeFormat("es-ES", {
																dateStyle: "medium",
															}).format(new Date(delivery.created_at))}
														</p>
														<p className="text-xs text-slate-500">
															{delivery.package_count} bulto
															{delivery.package_count === 1 ? "" : "s"} ·{" "}
															{delivery.line_count} referencia
															{delivery.line_count === 1 ? "" : "s"}
														</p>
													</div>

													<Link
														href={`/commercials/orders/${delivery.order_id}`}
														className="text-sm font-medium text-sky-700 hover:text-sky-800"
													>
														Ver pedido
													</Link>
												</div>
											</div>
										))}
									</div>

									<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
										<p className="text-xs text-slate-500">
											Se marcaran como entregados al escanear sus etiquetas QR en
											la visita.
										</p>

										<button
											type="button"
											onClick={() =>
												openCreateModal({
													clientId: group.clientId,
													visitTypeId: DELIVERY_VISIT_TYPE_ID,
													deliveryIds: group.deliveries.map(
														(delivery) => delivery.id,
													),
												})
											}
											className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
										>
											Crear visita con estos repartos
										</button>
									</div>
								</article>
							))}
						</div>
					</section>
				) : null}

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
								onClick={() => setIsFiltersOpen((currentValue) => !currentValue)}
								className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-gray-50"
							>
								{isFiltersOpen ? "Ocultar filtros" : "Mostrar filtros"}
							</button>
							<button
								type="button"
								onClick={() => openCreateModal()}
								className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
							>
								Nueva visita
							</button>
						</div>
					</div>

					{isFiltersOpen ? (
						<>
							<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
								<div>
									<label
										htmlFor="visits-filter-client"
										className="mb-1 block text-sm font-semibold text-slate-700"
									>
										Cliente
									</label>
									<select
										id="visits-filter-client"
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
									<label
										htmlFor="visits-filter-status"
										className="mb-1 block text-sm font-semibold text-slate-700"
									>
										Estado
									</label>
									<select
										id="visits-filter-status"
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
									<label
										htmlFor="visits-filter-type"
										className="mb-1 block text-sm font-semibold text-slate-700"
									>
										Tipo
									</label>
									<select
										id="visits-filter-type"
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
									<label
										htmlFor="visits-filter-date-from"
										className="mb-1 block text-sm font-semibold text-slate-700"
									>
										Desde
									</label>
									<input
										id="visits-filter-date-from"
										type="date"
										value={filterDateFrom}
										onChange={(event) => setFilterDateFrom(event.target.value)}
										className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-slate-500"
									/>
								</div>

								<div>
									<label
										htmlFor="visits-filter-date-to"
										className="mb-1 block text-sm font-semibold text-slate-700"
									>
										Hasta
									</label>
									<input
										id="visits-filter-date-to"
										type="date"
										value={filterDateTo}
										onChange={(event) => setFilterDateTo(event.target.value)}
										className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-slate-800 outline-none transition focus:border-slate-500"
									/>
								</div>
							</div>

							<div className="mt-4 flex flex-wrap items-center gap-3">
								<button
									type="button"
									onClick={handleClearFilters}
									className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-gray-50"
								>
									Limpiar filtros
								</button>
							</div>
						</>
					) : null}

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
							config={{
								cardVariant: "compact-visit",
								gridClassName:
									"grid grid-cols-1 gap-3 p-3 lg:grid-cols-3 2xl:grid-cols-6",
							}}
						/>
					) : null}
				</div>
			</PageTransition>

			{isMounted && isCreateModalOpen
				? createPortal(
						<div className="app-modal-overlay z-[120] p-4">
							<div className="w-full max-w-2xl rounded-[28px] border border-white/30 bg-white p-6 shadow-2xl">
								<div className="mb-5 flex items-start justify-between gap-4">
									<div>
										<h2 className="text-xl font-semibold text-slate-900">
											Crear visita
										</h2>
										<p className="mt-1 text-sm text-slate-600">
											La hora aproximada se recalculara después con la ruta del
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
										<label
											htmlFor="create-visit-client"
											className="mb-2 block text-sm font-medium text-slate-700"
										>
											Cliente
										</label>
										<select
											id="create-visit-client"
											value={clientId}
											onChange={(event) =>
												handleCreateVisitClientChange(event.target.value)
											}
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
										<label
											htmlFor="create-visit-type"
											className="mb-2 block text-sm font-medium text-slate-700"
										>
											Tipo de visita
										</label>
										<select
											id="create-visit-type"
											value={visitTypeId}
											onChange={(event) =>
												handleCreateVisitTypeChange(event.target.value)
											}
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
										<label
											htmlFor="create-visit-date"
											className="mb-2 block text-sm font-medium text-slate-700"
										>
											Dia de la visita
										</label>
										<input
											id="create-visit-date"
											type="date"
											value={scheduledForDate}
											onChange={(event) =>
												setScheduledForDate(event.target.value)
											}
											className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
											required
										/>
									</div>

									{visitTypeId === DELIVERY_VISIT_TYPE_ID ? (
										<div className="md:col-span-2">
											<div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
												<div className="flex flex-wrap items-center justify-between gap-3">
													<div>
														<h3 className="text-sm font-semibold text-slate-800">
															Repartos preparados para esta visita
														</h3>
														<p className="text-sm text-slate-600">
															Selecciona los repartos preparados del cliente que
															quieres entregar en esta visita.
														</p>
													</div>

													{clientId ? (
														<p className="text-sm font-medium text-sky-700">
															{selectedDeliveryIds.length} seleccionado
															{selectedDeliveryIds.length === 1 ? "" : "s"}
														</p>
													) : null}
												</div>

												{!clientId ? (
													<p className="mt-4 text-sm text-slate-500">
														Selecciona antes un cliente para ver sus repartos
														preparados sin visita asignada.
													</p>
												) : pendingDeliveriesForSelectedClient.length > 0 ? (
													<div className="mt-4 space-y-3">
														{pendingDeliveriesForSelectedClient.map((delivery) => (
															<label
																key={delivery.id}
																className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition hover:border-sky-300"
															>
																<input
																	type="checkbox"
																	checked={selectedDeliveryIds.includes(delivery.id)}
																	onChange={() =>
																		toggleSelectedDelivery(delivery.id)
																	}
																	className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
																/>

																<div className="min-w-0 flex-1">
																	<div className="flex flex-wrap items-center justify-between gap-2">
																		<p className="text-sm font-semibold text-slate-900">
																			Reparto {delivery.id.slice(0, 8)} · Pedido{" "}
																			{delivery.order_short_id} ·{" "}
																			{new Intl.DateTimeFormat("es-ES", {
																				dateStyle: "medium",
																			}).format(new Date(delivery.created_at))}
																		</p>
																		<p className="text-sm font-medium text-slate-900">
																			{delivery.package_count} bulto
																			{delivery.package_count === 1 ? "" : "s"}
																		</p>
																	</div>

																	<p className="mt-1 text-xs text-slate-500">
																		{delivery.line_count} referencia
																		{delivery.line_count === 1 ? "" : "s"} · Estado{" "}
																		{delivery.status_name}
																	</p>

																	{delivery.notes ? (
																		<p className="mt-2 text-sm text-slate-600">
																			{delivery.notes}
																		</p>
																	) : null}
																</div>
															</label>
														))}
													</div>
												) : (
													<p className="mt-4 text-sm text-slate-500">
														Este cliente no tiene pedidos confirmados pendientes
														de reparto.
													</p>
												)}
											</div>
										</div>
									) : null}

									<div className="md:col-span-2">
										<label
											htmlFor="create-visit-notes"
											className="mb-2 block text-sm font-medium text-slate-700"
										>
											Notas
										</label>
										<textarea
											id="create-visit-notes"
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
						</div>,
						document.body,
					)
				: null}
		</>
	);
}
