"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
	fetchAdminCommercialOptions,
	getAdminCommercialLabel,
	type AdminCommercialOption,
} from "@/app/admin/users/_shared/admin-commercial-options";
import PageTransition from "@/app/components/animations/PageTransition";
import { useSessionStorageState } from "@/app/hooks/useSessionStorageState";
import { requestJson } from "@/lib/api/client";
import type { CommercialClient } from "@/lib/contracts/commercial-client";
import type {
	ClientCommercialAssignment,
	UpsertClientCommercialAssignmentBody,
} from "@/lib/contracts/client-commercial-assignment";
import { formatDateTime } from "@/lib/utils/user-utils";

function AdminClientCommercialAssignmentsFallback() {
	return (
		<PageTransition>
			<div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm text-slate-600 shadow-sm">
				Cargando asignaciones comerciales...
			</div>
		</PageTransition>
	);
}

// Página de administración para asignar comerciales a clientes. Permite seleccionar un cliente, ver su comercial asignado actualmente (si existe), buscar y seleccionar un nuevo comercial, agregar notas a la asignación, y guardar o eliminar la asignación.
function AdminClientCommercialAssignmentsPageContent() {
	const searchParams = useSearchParams();
	const [clients, setClients] = useState<CommercialClient[]>([]);
	const [commercials, setCommercials] = useState<AdminCommercialOption[]>([]);
	const [selectedClientId, setSelectedClientId] = useState("");
	const [selectedCommercialId, setSelectedCommercialId] = useState("");
	const [currentAssignment, setCurrentAssignment] =
		useState<ClientCommercialAssignment | null>(null);
	const [clientSearch, setClientSearch] = useSessionStorageState(
		"admin-client-commercial-assignments:client-search",
		"",
	);
	const [commercialSearch, setCommercialSearch] = useSessionStorageState(
		"admin-client-commercial-assignments:commercial-search",
		"",
	);
	const [notes, setNotes] = useState("");
	const [loadingBaseData, setLoadingBaseData] = useState(true);
	const [loadingAssignment, setLoadingAssignment] = useState(false);
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	const initialClientId = searchParams.get("clientId") ?? "";

	const filteredClients = useMemo(() => {
		const term = clientSearch.trim().toLowerCase();

		if (!term) {
			return clients;
		}

		return clients.filter((client) =>
			[
				client.name,
				client.contact_name,
				client.city,
				client.province,
				client.user?.email,
				client.user?.name,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(term)),
		);
	}, [clients, clientSearch]);

	const filteredCommercials = useMemo(() => {
		const term = commercialSearch.trim().toLowerCase();

		if (!term) {
			return commercials;
		}

		return commercials.filter((commercial) =>
			[
				commercial.user?.name,
				commercial.user?.email,
				commercial.employee_code,
				commercial.territory,
			]
				.filter(Boolean)
				.some((value) => String(value).toLowerCase().includes(term)),
		);
	}, [commercials, commercialSearch]);

	const selectedClient =
		clients.find((client) => client.id === selectedClientId) ?? null;
	const selectedClientVisible = filteredClients.some(
		(client) => client.id === selectedClientId,
	);
	const selectedCommercial =
		commercials.find((commercial) => commercial.id === selectedCommercialId) ??
		null;
	const currentCommercialId = currentAssignment?.commercial_id ?? "";
	const hasCurrentAssignment = Boolean(currentAssignment);
	const sameCommercialSelected = Boolean(
		hasCurrentAssignment &&
		selectedCommercialId &&
		selectedCommercialId === currentCommercialId,
	);

	useEffect(() => {
		let ignore = false;

		async function loadBaseData() {
			try {
				setLoadingBaseData(true);
				setError("");

				const [clientsData, commercialsData] = await Promise.all([
					requestJson<CommercialClient[]>("/api/admin/clients", {
						cache: "no-store",
						fallbackMessage: "No se pudieron cargar los clientes",
					}),
					fetchAdminCommercialOptions(),
				]);

				if (ignore) {
					return;
				}

				const safeClients = Array.isArray(clientsData) ? clientsData : [];
				const safeCommercials = Array.isArray(commercialsData)
					? commercialsData
					: [];

				setClients(safeClients);
				setCommercials(safeCommercials);
				setSelectedClientId((currentClientId) => {
					if (currentClientId) {
						return currentClientId;
					}

					if (safeClients.length === 0) {
						return "";
					}

					const requestedClientExists = safeClients.some(
						(client) => client.id === initialClientId,
					);

					return requestedClientExists ? initialClientId : safeClients[0].id;
				});
			} catch (loadError) {
				if (!ignore) {
					setError(
						loadError instanceof Error
							? loadError.message
							: "Error al cargar datos",
					);
				}
			} finally {
				if (!ignore) {
					setLoadingBaseData(false);
				}
			}
		}

		void loadBaseData();

		return () => {
			ignore = true;
		};
	}, [initialClientId]);

	useEffect(() => {
		let ignore = false;

		async function loadCurrentAssignment() {
			if (!selectedClientId) {
				setCurrentAssignment(null);
				setSelectedCommercialId("");
				setNotes("");
				return;
			}

			try {
				setLoadingAssignment(true);
				setError("");
				setSuccess("");

				const assignment = await requestJson<ClientCommercialAssignment | null>(
					`/api/admin/client-commercial-assignments?clientId=${selectedClientId}`,
					{
						cache: "no-store",
						fallbackMessage: "Error al cargar la asignación actual",
					},
				);

				if (ignore) {
					return;
				}

				setCurrentAssignment(assignment ?? null);
				setSelectedCommercialId(assignment?.commercial_id ?? "");
				setNotes(assignment?.notes ?? "");
			} catch (loadError) {
				if (ignore) {
					return;
				}

				setError(
					loadError instanceof Error
						? loadError.message
						: "Error al cargar la asignación actual",
				);
				setCurrentAssignment(null);
				setSelectedCommercialId("");
			} finally {
				if (!ignore) {
					setLoadingAssignment(false);
				}
			}
		}

		void loadCurrentAssignment();

		return () => {
			ignore = true;
		};
	}, [selectedClientId]);

	async function handleAssignOrReassign() {
		if (!selectedClientId) {
			setError("Debes seleccionar un cliente");
			return;
		}

		if (!selectedCommercialId) {
			setError("Debes seleccionar un comercial");
			return;
		}

		if (sameCommercialSelected) {
			setError("Ese comercial ya esta asignado actualmente a este cliente");
			return;
		}

		try {
			setSubmitting(true);
			setError("");
			setSuccess("");

			const mode = hasCurrentAssignment ? "reassign" : "assign";
			const assignment = await requestJson<ClientCommercialAssignment>(
				"/api/admin/client-commercial-assignments",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						mode,
						clientId: selectedClientId,
						commercialId: selectedCommercialId,
						notes: notes.trim() || null,
					} satisfies UpsertClientCommercialAssignmentBody),
					fallbackMessage: "No se pudo guardar la asignación",
				},
			);

			setCurrentAssignment(assignment);
			setSelectedCommercialId(assignment.commercial_id);
			setNotes(assignment.notes ?? "");
			setSuccess(
				mode === "assign"
					? "Comercial asignado correctamente"
					: "Comercial reasignado correctamente",
			);
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: "No se pudo guardar la asignación",
			);
		} finally {
			setSubmitting(false);
		}
	}

	async function handleUnassign() {
		if (!selectedClientId) {
			setError("Debes seleccionar un cliente");
			return;
		}

		if (!currentAssignment) {
			setError("El cliente no tiene una asignación activa");
			return;
		}

		try {
			setSubmitting(true);
			setError("");
			setSuccess("");

			await requestJson<ClientCommercialAssignment>(
				"/api/admin/client-commercial-assignments",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						mode: "unassign",
						clientId: selectedClientId,
						notes: notes.trim() || null,
					} satisfies UpsertClientCommercialAssignmentBody),
					fallbackMessage: "No se pudo eliminar la asignación",
				},
			);

			setCurrentAssignment(null);
			setSelectedCommercialId("");
			setSuccess("Asignación eliminada correctamente");
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: "No se pudo eliminar la asignación",
			);
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<PageTransition>
			<div className="max-w-full space-y-6 overflow-x-hidden">
				{error ? (
					<div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
						{error}
					</div>
				) : null}

				{success ? (
					<div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
						{success}
					</div>
				) : null}

				<div className="max-w-full space-y-6">
					<section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
						<div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<h2 className="text-lg font-semibold text-slate-900">
									Clientes
								</h2>
								<p className="mt-1 text-sm text-slate-600">
									Selecciona un cliente para ver o cambiar su comercial
									asignado.
								</p>
							</div>

							<input
								type="text"
								value={clientSearch}
								onChange={(event) => setClientSearch(event.target.value)}
								placeholder="Buscar cliente..."
								className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 sm:max-w-xs"
							/>
						</div>

						<select
							value={selectedClientId}
							onChange={(event) => setSelectedClientId(event.target.value)}
							disabled={loadingBaseData || clients.length === 0}
							className="mb-4 w-full min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
						>
							<option value="">
								{loadingBaseData
									? "Cargando clientes..."
									: filteredClients.length === 0
										? "Sin coincidencias"
										: "Selecciona un cliente"}
							</option>
							{selectedClient && !selectedClientVisible ? (
								<option value={selectedClient.id}>{selectedClient.name}</option>
							) : null}
							{filteredClients.map((client) => (
								<option key={client.id} value={client.id}>
									{client.name}
								</option>
							))}
						</select>

						<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
							<div className="text-xs font-medium uppercase tracking-wide text-slate-500">
								Cliente seleccionado
							</div>
							<div className="mt-1 truncate text-base font-semibold text-slate-900">
								{selectedClient?.name ?? "Selecciona un cliente"}
							</div>
							<p className="mt-1 text-xs text-slate-500">
								Mostrando {filteredClients.length} de {clients.length} clientes.
							</p>
						</div>

					</section>

					<section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
						<div className="space-y-5">
							<div>
								<h2 className="text-lg font-semibold text-slate-900">
									Comercial asignado
								</h2>
								<p className="mt-1 text-sm text-slate-600">
									Esta asignación define la cartera del comercial y la base para
									sus visitas y futuras rutas.
								</p>
							</div>

							{selectedClient ? (
								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<div className="text-xs font-medium uppercase tracking-wide text-slate-500">
										Cliente seleccionado
									</div>
									<div className="mt-2 text-lg font-semibold text-slate-900">
										{selectedClient.name}
									</div>
								</div>
							) : (
								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
									Selecciona un cliente para continuar.
								</div>
							)}

							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<div className="text-xs font-medium uppercase tracking-wide text-slate-500">
									Comercial actualmente asignado
								</div>

								{loadingAssignment ? (
									<div className="mt-3 text-sm text-slate-600">
										Cargando asignación actual...
									</div>
								) : currentAssignment ? (
									<div className="mt-3 space-y-2">
										<div className="text-base font-semibold text-slate-900">
											{currentAssignment.commercial?.user?.name ||
												"Comercial sin nombre"}
										</div>
										<div className="text-sm text-slate-600">
											{currentAssignment.commercial?.user?.email || "Sin email"}
										</div>
										<div className="text-sm text-slate-600">
											<strong className="font-medium text-slate-900">
												Asignado el:
											</strong>{" "}
											{formatDateTime(currentAssignment.assigned_at)}
										</div>
										<div className="text-sm text-slate-600">
											<strong className="font-medium text-slate-900">
												Notas:
											</strong>{" "}
											{currentAssignment.notes || "-"}
										</div>
									</div>
								) : (
									<div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
										Este cliente no tiene comercial asignado actualmente.
									</div>
								)}
							</div>

							<div>
								<label
									htmlFor="assignment-commercial-search"
									className="mb-2 block text-sm font-medium text-slate-900"
								>
									Buscar comercial
								</label>

								<input
									id="assignment-commercial-search"
									type="text"
									value={commercialSearch}
									onChange={(event) => setCommercialSearch(event.target.value)}
									placeholder="Buscar comercial..."
									className="mb-3 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>

								<select
									value={selectedCommercialId}
									onChange={(event) =>
										setSelectedCommercialId(event.target.value)
									}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								>
									<option value="">Selecciona un comercial</option>
									{filteredCommercials.map((commercial) => (
										<option key={commercial.id} value={commercial.id}>
											{getAdminCommercialLabel(commercial)}
										</option>
									))}
								</select>

								{selectedCommercial ? (
									<div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
										<div>
											<strong className="font-medium text-slate-900">
												Comercial:
											</strong>{" "}
											{selectedCommercial.user?.name || "Sin nombre"}
										</div>
										<div className="mt-1">
											<strong className="font-medium text-slate-900">
												Email:
											</strong>{" "}
											{selectedCommercial.user?.email || "Sin email"}
										</div>
										<div className="mt-1">
											<strong className="font-medium text-slate-900">
												Territorio:
											</strong>{" "}
											{selectedCommercial.territory || "No definido"}
										</div>
										<div className="mt-1">
											<strong className="font-medium text-slate-900">
												Código:
											</strong>{" "}
											{selectedCommercial.employee_code || "No definido"}
										</div>
									</div>
								) : null}
							</div>

							<div>
								<label
									htmlFor="assignment-notes"
									className="mb-2 block text-sm font-medium text-slate-900"
								>
									Notas de la asignación
								</label>
								<textarea
									id="assignment-notes"
									value={notes}
									onChange={(event) => setNotes(event.target.value)}
									rows={4}
									placeholder="Notas internas sobre la cartera, responsable habitual, zona, contexto, etc."
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>
							</div>

							<div className="flex flex-col gap-3 sm:flex-row">
								<button
									type="button"
									onClick={handleAssignOrReassign}
									disabled={Boolean(
										submitting ||
										!selectedClientId ||
										!selectedCommercialId ||
										sameCommercialSelected,
									)}
									className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
								>
									{submitting
										? "Guardando..."
										: hasCurrentAssignment
											? "Reasignar comercial"
											: "Asignar comercial"}
								</button>

								<button
									type="button"
									onClick={handleUnassign}
									disabled={submitting || !currentAssignment}
									className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
								>
									Quitar asignación actual
								</button>
							</div>

							<p className="text-xs text-slate-500">
								Esta relación define la cartera activa del comercial y
								condiciona la gestión de clientes, visitas y futuras rutas.
							</p>
						</div>
					</section>
				</div>
			</div>
		</PageTransition>
	);
}

export default function AdminClientCommercialAssignmentsPage() {
	return (
		<Suspense fallback={<AdminClientCommercialAssignmentsFallback />}>
			<AdminClientCommercialAssignmentsPageContent />
		</Suspense>
	);
}
