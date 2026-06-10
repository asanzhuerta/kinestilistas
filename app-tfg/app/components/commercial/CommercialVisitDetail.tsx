"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";
import SafeForm from "@/app/components/forms/SafeForm";
import SubmitButton from "@/app/components/forms/SubmitButton";
import QrCameraScanner from "@/app/components/qr/QrCameraScanner";
import { useCommercialVisit } from "@/app/hooks/api/useCommercialVisit";
import {
	COMMERCIAL_VISIT_STATUS_IDS,
	COMMERCIAL_VISIT_TYPE_IDS,
	ORDER_STATUS_IDS,
} from "@/lib/typeorm/constants/catalog-ids";
import {
	extractOrderIdFromQrValue,
	normalizeOrderQrValues,
} from "@/lib/orders/qr";
import { formatTimeLabel } from "@/lib/utils/time";
import { formatDateTime } from "@/lib/utils/user-utils";
import {
	formatOrderCurrency,
	getOrderStatusClassesById,
} from "@/app/components/orders/order-ui";
import {
	COMMERCIAL_VISIT_STATUS_OPTIONS,
	COMMERCIAL_VISIT_TYPE_OPTIONS,
	formatVisitDate,
	getVisitStatusClasses,
	getVisitStatusLabel,
	getVisitTypeLabel,
	type CommercialVisitDeliveryOrder,
} from "./commercial-visit-types";

type Props = {
	visitId: string;
};

type VisitFormState = {
	scheduledForDate: string;
	visitTypeId: string;
	statusId: string;
	notes: string;
	result: string;
};

const DEFAULT_VISIT_FORM_STATE: VisitFormState = {
	scheduledForDate: "",
	visitTypeId: "",
	statusId: "",
	notes: "",
	result: "",
};

function DetailRow({
	label,
	value,
}: {
	label: string;
	value: string | null | undefined;
}) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
			<p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
				{label}
			</p>
			<p className="mt-1 text-sm font-medium text-slate-900">{value || "-"}</p>
		</div>
	);
}

function OrderMiniCard({
	order,
	message,
}: {
	order: CommercialVisitDeliveryOrder;
	message?: string;
}) {
	return (
		<article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
			<div className="flex flex-wrap items-center gap-2">
				<span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
					Pedido {order.id.slice(0, 8)}
				</span>
				<span
					className={`rounded-full px-3 py-1 text-xs font-semibold ${getOrderStatusClassesById(
						order.status_id,
					)}`}
				>
					{order.status_name}
				</span>
			</div>

			{message ? (
				<p className="mt-3 rounded-2xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
					{message}
				</p>
			) : null}

			<div className="mt-3 grid gap-2 sm:grid-cols-3">
				<DetailRow label="Importe" value={formatOrderCurrency(order.total_amount)} />
				<DetailRow label="Bultos" value={String(order.line_count)} />
				<DetailRow label="Actualizado" value={formatDateTime(order.updated_at)} />
			</div>

			{order.notes ? (
				<p className="mt-3 text-sm leading-6 text-slate-600">{order.notes}</p>
			) : null}
		</article>
	);
}

export default function CommercialVisitDetail({ visitId }: Props) {
	const {
		data: visit,
		loading,
		error,
		save,
	} = useCommercialVisit(visitId);
	const [saving, setSaving] = useState(false);
	const [savingQr, setSavingQr] = useState(false);
	const [savingRoutineCompletion, setSavingRoutineCompletion] = useState(false);
	const [success, setSuccess] = useState("");
	const [submissionError, setSubmissionError] = useState("");
	const [qrScanFeedback, setQrScanFeedback] = useState("");
	const [scannerOpen, setScannerOpen] = useState(false);
	const [isEditModalOpen, setIsEditModalOpen] = useState(false);
	const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
	const [deliveredOrderQrInput, setDeliveredOrderQrInput] = useState("");
	const [formState, setFormState] = useState<VisitFormState>(
		DEFAULT_VISIT_FORM_STATE,
	);

	useEffect(() => {
		if (!visit) {
			return;
		}

		setFormState({
			scheduledForDate: visit.scheduled_for_date,
			visitTypeId: String(visit.visit_type_id),
			statusId: String(visit.status_id),
			notes: visit.notes ?? "",
			result: visit.result ?? "",
		});
		setSelectedOrderIds(visit.linkedOrders.map((order) => order.id));
		setDeliveredOrderQrInput("");
		setQrScanFeedback("");
	}, [visit]);

	const isPostponed =
		visit?.status_id === COMMERCIAL_VISIT_STATUS_IDS.POSTPONED;
	const isPlanned = visit?.status_id === COMMERCIAL_VISIT_STATUS_IDS.PLANNED;
	const isDeliveryVisit =
		visit?.visit_type_id === COMMERCIAL_VISIT_TYPE_IDS.DELIVERY;
	const isRoutineVisit =
		visit?.visit_type_id === COMMERCIAL_VISIT_TYPE_IDS.ROUTINE;
	const hasLinkedOrders = Boolean(visit?.linkedOrders.length);
	const hasCompletedElsewhereOrders = Boolean(
		visit?.completedElsewhereOrders.length,
	);
	const hasPendingLinkedOrders = Boolean(
		visit?.linkedOrders.some(
			(order) => order.status_id === ORDER_STATUS_IDS.CONFIRMED,
		),
	);
	const canScanQr =
		Boolean(visit) &&
		isDeliveryVisit &&
		isPlanned &&
		hasLinkedOrders &&
		hasPendingLinkedOrders &&
		!isPostponed;
	const canCompleteRoutineVisit =
		Boolean(visit) && isRoutineVisit && isPlanned && !isPostponed;
	const canEditManually = Boolean(visit) && !isPostponed;

	const deliveryOrdersForEdit = useMemo(() => {
		if (!visit) {
			return [] as CommercialVisitDeliveryOrder[];
		}

		const ordersById = new Map<string, CommercialVisitDeliveryOrder>();

		for (const order of visit.linkedOrders) {
			ordersById.set(order.id, order);
		}

		for (const order of visit.availableOrdersForDelivery) {
			ordersById.set(order.id, order);
		}

		return Array.from(ordersById.values());
	}, [visit]);

	const scannedDeliveredOrderIds = useMemo(
		() =>
			normalizeOrderQrValues(
				deliveredOrderQrInput
					.split(/\r?\n/)
					.map((value) => value.trim())
					.filter(Boolean),
			).filter((orderId) => selectedOrderIds.includes(orderId)),
		[deliveredOrderQrInput, selectedOrderIds],
	);

	const locationLabel = visit
		? [visit.client?.city, visit.client?.province].filter(Boolean).join(" - ")
		: "";
	const visitWindowLabel =
		visit?.client?.visit_window_start_time &&
		visit?.client?.visit_window_end_time
			? `${formatTimeLabel(
					visit.client.visit_window_start_time,
				)} - ${formatTimeLabel(visit.client.visit_window_end_time)}`
			: "-";

	function toggleOrderSelection(orderId: string) {
		setSelectedOrderIds((currentOrderIds) =>
			currentOrderIds.includes(orderId)
				? currentOrderIds.filter((currentOrderId) => currentOrderId !== orderId)
				: [...currentOrderIds, orderId],
		);
	}

	function openEditModal() {
		if (!visit || isPostponed) {
			return;
		}

		setSubmissionError("");
		setSuccess("");
		setIsEditModalOpen(true);
	}

	async function handleDetectedQr(rawValue: string) {
		if (!visit) {
			return {
				accepted: false,
				message: "No se ha cargado la visita todavia.",
			};
		}

		if (isPostponed) {
			return {
				accepted: false,
				message:
					"Esta visita esta aplazada y no se puede modificar. Crea una nueva visita.",
			};
		}

		const orderId = extractOrderIdFromQrValue(rawValue);

		if (!orderId) {
			return {
				accepted: false,
				message: "El QR escaneado no tiene un formato reconocido para pedidos.",
			};
		}

		const linkedOrder = visit.linkedOrders.find((order) => order.id === orderId);

		if (!linkedOrder) {
			return {
				accepted: false,
				message:
					"El QR escaneado no pertenece a ningun pedido vinculado a esta visita.",
			};
		}

		if (linkedOrder.status_id === ORDER_STATUS_IDS.DELIVERED) {
			return {
				accepted: false,
				message:
					linkedOrder.delivery_visit_id === visit.id
						? "Este pedido ya estaba completado."
						: "Este pedido ya se ha completado en otra visita.",
			};
		}

		try {
			setSavingQr(true);
			setSubmissionError("");
			setSuccess("");

			await save({
				scannedOrderQr: rawValue,
				result: formState.result || "Entrega confirmada mediante QR.",
			});

			setQrScanFeedback("Pedido completado correctamente mediante QR.");
			setSuccess("Pedido completado correctamente mediante QR.");

			return {
				accepted: true,
				message: "Pedido completado correctamente mediante QR.",
				stop: true,
			};
		} catch (err) {
			const message =
				err instanceof Error
					? err.message
					: "No se pudo completar el pedido escaneado.";
			setSubmissionError(message);

			return {
				accepted: false,
				message,
			};
		} finally {
			setSavingQr(false);
		}
	}

	async function handleCompleteRoutineVisit() {
		if (!visit || !canCompleteRoutineVisit) {
			return;
		}

		try {
			setSavingRoutineCompletion(true);
			setSubmissionError("");
			setSuccess("");

			await save({
				statusId: COMMERCIAL_VISIT_STATUS_IDS.COMPLETED,
				result: formState.result || "Visita rutinaria completada.",
			});

			setSuccess("Visita rutinaria completada correctamente.");
		} catch (err) {
			setSubmissionError(
				err instanceof Error
					? err.message
					: "No se pudo completar la visita rutinaria.",
			);
		} finally {
			setSavingRoutineCompletion(false);
		}
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();

		if (!visit || isPostponed) {
			setSubmissionError(
				"Esta visita esta aplazada y no se puede modificar. Crea una nueva visita.",
			);
			return;
		}

		if (
			formState.visitTypeId === String(COMMERCIAL_VISIT_TYPE_IDS.DELIVERY) &&
			formState.statusId !== String(COMMERCIAL_VISIT_STATUS_IDS.CANCELLED) &&
			selectedOrderIds.length === 0
		) {
			setSubmissionError(
				"Un reparto activo debe tener al menos un pedido confirmado vinculado.",
			);
			return;
		}

		if (
			formState.visitTypeId === String(COMMERCIAL_VISIT_TYPE_IDS.DELIVERY) &&
			visit.status_id !== COMMERCIAL_VISIT_STATUS_IDS.COMPLETED &&
			formState.statusId === String(COMMERCIAL_VISIT_STATUS_IDS.COMPLETED) &&
			scannedDeliveredOrderIds.length !== selectedOrderIds.length
		) {
			setSubmissionError(
				"Para completar un reparto manualmente debes aportar el QR de todos los pedidos vinculados.",
			);
			return;
		}

		try {
			setSaving(true);
			setSuccess("");
			setSubmissionError("");

			await save({
				...(isPlanned
					? {
							scheduledForDate: formState.scheduledForDate,
							visitTypeId: Number(formState.visitTypeId),
							orderIds:
								formState.visitTypeId ===
								String(COMMERCIAL_VISIT_TYPE_IDS.DELIVERY)
									? selectedOrderIds
									: [],
						}
					: {}),
				deliveredOrderQrs:
					formState.visitTypeId === String(COMMERCIAL_VISIT_TYPE_IDS.DELIVERY)
						? deliveredOrderQrInput
								.split(/\r?\n/)
								.map((value) => value.trim())
								.filter(Boolean)
						: [],
				statusId: Number(formState.statusId),
				notes: formState.notes,
				result: formState.result,
			});

			setSuccess("Visita actualizada correctamente.");
			setIsEditModalOpen(false);
		} catch (err) {
			setSubmissionError(
				err instanceof Error ? err.message : "No se pudo actualizar la visita.",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<PageTransition>
			<div className="space-y-5">
				<H1Title
					title="Detalle de visita"
					subtitle="Gestiona la visita, sus pedidos y los datos del cliente."
				/>

				<div className="flex justify-start">
					<Link
						href="/commercials/visits"
						className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
					>
						Volver
					</Link>
				</div>

				{success ? (
					<div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
						{success}
					</div>
				) : null}

				{submissionError ? (
					<div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
						{submissionError}
					</div>
				) : null}

				{loading ? (
					<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<p className="text-sm text-slate-600">Cargando visita...</p>
					</section>
				) : null}

				{!loading && error ? (
					<section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
						<h2 className="text-lg font-semibold text-rose-700">
							No se pudo cargar la visita
						</h2>
						<p className="mt-2 text-sm text-rose-600">{error}</p>
					</section>
				) : null}

				{!loading && !error && visit ? (
					<>
						<section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
							<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
								<div className="min-w-0">
									<div className="flex flex-wrap items-center gap-2">
										<span
											className={`rounded-full px-3 py-1 text-sm font-semibold ${getVisitStatusClasses(
												visit.status_id,
											)}`}
										>
											{getVisitStatusLabel(visit.status_id)}
										</span>
										<span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700">
											{getVisitTypeLabel(visit.visit_type_id)}
										</span>
										<span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
											{formatVisitDate(visit.scheduled_for_date)}
										</span>
									</div>
									<p className="mt-3 text-sm leading-6 text-slate-600">
										{isPostponed
											? "Esta visita esta aplazada y queda bloqueada. Para continuar con el cliente o el reparto, crea una visita nueva."
											: "Gestiona la visita desde las acciones principales o abre la edicion manual si necesitas corregir datos."}
									</p>
								</div>

								<div className="flex flex-wrap gap-3">
									{isDeliveryVisit ? (
										<button
											type="button"
											onClick={() => setScannerOpen(true)}
											disabled={!canScanQr || savingQr}
											className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
										>
											{savingQr ? "Completando..." : "Escanear QR"}
										</button>
									) : null}
									{isRoutineVisit ? (
										<button
											type="button"
											onClick={handleCompleteRoutineVisit}
											disabled={
												!canCompleteRoutineVisit || savingRoutineCompletion
											}
											className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
										>
											{savingRoutineCompletion
												? "Completando..."
												: "TERMINAR visita"}
										</button>
									) : null}
									<button
										type="button"
										onClick={openEditModal}
										disabled={!canEditManually}
										className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
									>
										Editar manualmente
									</button>
								</div>
							</div>
							{qrScanFeedback ? (
								<p className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
									{qrScanFeedback}
								</p>
							) : null}
						</section>

						<div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
							<aside className="space-y-4">
								<section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
									<h2 className="text-base font-semibold text-slate-900">
										Informacion de la visita
									</h2>
									<div className="mt-4 grid gap-3">
										<DetailRow
											label="Fecha"
											value={formatVisitDate(visit.scheduled_for_date)}
										/>
										<DetailRow
											label="Tipo"
											value={getVisitTypeLabel(visit.visit_type_id)}
										/>
										<DetailRow
											label="Estado"
											value={getVisitStatusLabel(visit.status_id)}
										/>
										<DetailRow label="Notas" value={visit.notes || "-"} />
										<DetailRow label="Resultado" value={visit.result || "-"} />
									</div>
								</section>

								{isPostponed ? (
									<section className="rounded-3xl border border-orange-200 bg-orange-50 p-5 shadow-sm">
										<h2 className="text-base font-semibold text-orange-800">
											Visita bloqueada
										</h2>
										<p className="mt-2 text-sm leading-6 text-orange-700">
											Las visitas aplazadas no se reprograman ni se editan. La
											operativa correcta es crear una visita nueva.
										</p>
									</section>
								) : null}
							</aside>

							<main className="space-y-5">
								<section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
									<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
										<div>
											<h2 className="text-xl font-semibold text-slate-900">
												{visit.client?.name ?? "Cliente"}
											</h2>
											<p className="mt-1 text-sm text-slate-500">
												{visit.client?.contact_name || "Sin contacto principal"}
											</p>
										</div>
										<Link
											href={`/commercials/clients/${visit.client_id}`}
											className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
										>
											Ver cliente
										</Link>
									</div>

									<div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
										<DetailRow
											label="Telefono"
											value={visit.client?.user?.phone || "-"}
										/>
										<DetailRow
											label="Correo"
											value={visit.client?.user?.email || "-"}
										/>
										<DetailRow
											label="Ubicacion"
											value={locationLabel || "-"}
										/>
										<DetailRow label="Franja" value={visitWindowLabel} />
									</div>
								</section>

								{hasLinkedOrders || hasCompletedElsewhereOrders ? (
									<section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
										<h2 className="text-lg font-semibold text-slate-900">
											Pedidos del reparto
										</h2>
										<div className="mt-4 grid gap-3 xl:grid-cols-2">
											{visit.linkedOrders.map((order) => (
												<OrderMiniCard key={order.id} order={order} />
											))}

											{visit.completedElsewhereOrders.map((order) => (
												<OrderMiniCard
													key={`elsewhere-${order.id}`}
													order={order}
													message="Este pedido ya se ha completado en otra visita."
												/>
											))}
										</div>
									</section>
								) : null}
							</main>
						</div>
					</>
				) : null}
			</div>

			{visit && isEditModalOpen ? (
				<div className="app-modal-overlay z-[90] px-4 py-6">
					<div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-6 shadow-2xl">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
							<div>
								<h2 className="text-xl font-semibold text-slate-900">
									Editar visita manualmente
								</h2>
								<p className="mt-1 text-sm text-slate-500">
									Modifica fecha, tipo, estado, notas, resultado y pedidos
									vinculados si hace falta.
								</p>
							</div>
							<button
								type="button"
								onClick={() => setIsEditModalOpen(false)}
								className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
							>
								Cerrar
							</button>
						</div>

						<SafeForm onSubmit={handleSubmit} className="mt-6 grid gap-4 md:grid-cols-2">
							<div>
								<label
									htmlFor="visit-scheduled-for-date"
									className="mb-2 block text-sm font-medium text-slate-700"
								>
									Dia de la visita
								</label>
								<input
									id="visit-scheduled-for-date"
									type="date"
									value={formState.scheduledForDate}
									onChange={(event) =>
										setFormState((currentState) => ({
											...currentState,
											scheduledForDate: event.target.value,
										}))
									}
									disabled={!isPlanned}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
								/>
							</div>

							<div>
								<label
									htmlFor="visit-type-id"
									className="mb-2 block text-sm font-medium text-slate-700"
								>
									Tipo de visita
								</label>
								<select
									id="visit-type-id"
									value={formState.visitTypeId}
									onChange={(event) => {
										const nextVisitTypeId = event.target.value;
										setFormState((currentState) => ({
											...currentState,
											visitTypeId: nextVisitTypeId,
										}));

										if (
											nextVisitTypeId !==
											String(COMMERCIAL_VISIT_TYPE_IDS.DELIVERY)
										) {
											setSelectedOrderIds([]);
										}
									}}
									disabled={!isPlanned}
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
								<label
									htmlFor="visit-status-id"
									className="mb-2 block text-sm font-medium text-slate-700"
								>
									Estado
								</label>
								<select
									id="visit-status-id"
									value={formState.statusId}
									onChange={(event) =>
										setFormState((currentState) => ({
											...currentState,
											statusId: event.target.value,
										}))
									}
									disabled={!isPlanned}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
								>
									{COMMERCIAL_VISIT_STATUS_OPTIONS.map((status) => (
										<option key={status.id} value={String(status.id)}>
											{status.label}
										</option>
									))}
								</select>
							</div>

							<div>
								<label
									htmlFor="visit-notes"
									className="mb-2 block text-sm font-medium text-slate-700"
								>
									Notas
								</label>
								<textarea
									id="visit-notes"
									value={formState.notes}
									onChange={(event) =>
										setFormState((currentState) => ({
											...currentState,
											notes: event.target.value,
										}))
									}
									rows={4}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>
							</div>

							<div className="md:col-span-2">
								<label
									htmlFor="visit-result"
									className="mb-2 block text-sm font-medium text-slate-700"
								>
									Resultado
								</label>
								<textarea
									id="visit-result"
									value={formState.result}
									onChange={(event) =>
										setFormState((currentState) => ({
											...currentState,
											result: event.target.value,
										}))
									}
									rows={4}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									placeholder="Conclusiones, acuerdos o siguientes pasos..."
								/>
							</div>

							{formState.visitTypeId ===
							String(COMMERCIAL_VISIT_TYPE_IDS.DELIVERY) ? (
								<div className="md:col-span-2 rounded-3xl border border-slate-200 bg-slate-50 p-4">
									<h3 className="text-sm font-semibold text-slate-900">
										Pedidos vinculados
									</h3>
									{deliveryOrdersForEdit.length === 0 ? (
										<p className="mt-3 text-sm text-slate-500">
											No hay pedidos disponibles para vincular.
										</p>
									) : (
										<div className="mt-3 grid gap-2 md:grid-cols-2">
											{deliveryOrdersForEdit.map((order) => {
												const isSelected = selectedOrderIds.includes(order.id);
												const isDelivered =
													order.status_id === ORDER_STATUS_IDS.DELIVERED;

												return (
													<label
														key={order.id}
														className={`rounded-2xl border px-3 py-3 text-sm transition ${
															isSelected
																? "border-sky-300 bg-sky-50"
																: "border-slate-200 bg-white"
														} ${
															!isPlanned || isDelivered
																? "cursor-not-allowed opacity-70"
																: "cursor-pointer hover:border-slate-300"
														}`}
													>
														<div className="flex items-start gap-3">
															<input
																type="checkbox"
																checked={isSelected}
																onChange={() => toggleOrderSelection(order.id)}
																disabled={!isPlanned || isDelivered}
																className="mt-1 h-4 w-4 rounded border-slate-300"
															/>
															<div>
																<p className="font-semibold text-slate-900">
																	Pedido {order.id.slice(0, 8)}
																</p>
																<p className="mt-1 text-slate-500">
																	{order.status_name} -{" "}
																	{formatOrderCurrency(order.total_amount)}
																</p>
															</div>
														</div>
													</label>
												);
											})}
										</div>
									)}
								</div>
							) : null}

							{formState.visitTypeId ===
								String(COMMERCIAL_VISIT_TYPE_IDS.DELIVERY) &&
							formState.statusId ===
								String(COMMERCIAL_VISIT_STATUS_IDS.COMPLETED) ? (
								<div className="md:col-span-2">
									<label
										htmlFor="visit-delivered-order-qrs"
										className="mb-2 block text-sm font-medium text-slate-700"
									>
										QR para completar manualmente
									</label>
									<textarea
										id="visit-delivered-order-qrs"
										value={deliveredOrderQrInput}
										onChange={(event) =>
											setDeliveredOrderQrInput(event.target.value)
										}
										rows={3}
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
										placeholder="Un QR por bulto"
									/>
									<p className="mt-2 text-sm text-slate-500">
										QR reconocidos: {scannedDeliveredOrderIds.length}/
										{selectedOrderIds.length}
									</p>
								</div>
							) : null}

							<div className="md:col-span-2 flex flex-wrap items-center gap-3">
								<SubmitButton
									isSubmitting={saving}
									submittingText="Guardando..."
									className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
								>
									Guardar cambios
								</SubmitButton>
								<button
									type="button"
									onClick={() => setIsEditModalOpen(false)}
									className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
								>
									Cancelar
								</button>
							</div>
						</SafeForm>
					</div>
				</div>
			) : null}

			<QrCameraScanner
				isOpen={scannerOpen}
				onClose={() => setScannerOpen(false)}
				onDetected={handleDetectedQr}
			/>
		</PageTransition>
	);
}
