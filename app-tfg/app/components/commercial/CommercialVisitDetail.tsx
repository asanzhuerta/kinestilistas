"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import DataTable from "@/app/components/DataTable";
import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";
import SafeForm from "@/app/components/forms/SafeForm";
import SubmitButton from "@/app/components/forms/SubmitButton";
import QrCameraScanner from "@/app/components/qr/QrCameraScanner";
import { useCommercialVisit } from "@/app/hooks/api/useCommercialVisit";
import { formatDateTime } from "@/lib/utils/user-utils";
import { formatTimeLabel } from "@/lib/utils/time";
import {
	extractOrderIdFromQrValue,
	normalizeOrderQrValues,
} from "@/lib/orders/qr";
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
} from "./commercial-visit-types";

type Props = {
	visitId: string;
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

type VisitFormState = {
	scheduledForDate: string;
	visitTypeId: string;
	statusId: string;
	notes: string;
	result: string;
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

const DEFAULT_VISIT_FORM_STATE: VisitFormState = {
	scheduledForDate: "",
	visitTypeId: "",
	statusId: "",
	notes: "",
	result: "",
};

function CollapsibleSection({
	title,
	description,
	defaultOpen = false,
	children,
}: {
	title: string;
	description?: string;
	defaultOpen?: boolean;
	children: ReactNode;
}) {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	return (
		<section className="glass-card rounded-3xl border border-white/30 bg-white/75 shadow-xl backdrop-blur">
			<button
				type="button"
				onClick={() => setIsOpen((currentValue) => !currentValue)}
				aria-expanded={isOpen}
				className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left sm:px-6"
			>
				<div>
					<h2 className="text-base font-semibold text-slate-900 sm:text-lg">
						{title}
					</h2>
					{description ? (
						<p className="mt-1 text-sm text-slate-600">{description}</p>
					) : null}
				</div>

				<span className="text-2xl leading-none text-slate-400">
					{isOpen ? "−" : "+"}
				</span>
			</button>

			{isOpen ? (
				<div className="border-t border-slate-200/70 p-5 sm:p-6">{children}</div>
			) : null}
		</section>
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
	const [success, setSuccess] = useState("");
	const [submissionError, setSubmissionError] = useState("");
	const [deliveredOrderQrInput, setDeliveredOrderQrInput] = useState("");
	const [qrScanFeedback, setQrScanFeedback] = useState("");
	const [scannerOpen, setScannerOpen] = useState(false);
	const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
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

	const canEditPlanning = useMemo(
		() => visit?.status_id === 1 || visit?.status_id === 4,
		[visit],
	);

	const isDeliveryVisit = formState.visitTypeId === "1";
	const deliveryOrdersLocked = !canEditPlanning;
	const isActiveDeliveryVisit =
		isDeliveryVisit && visit?.status_id !== 2 && visit?.status_id !== 3;

	const deliveryOrdersForDisplay = useMemo(() => {
		const availableDeliveryOrders = visit?.availableOrdersForDelivery ?? [];
		const ordersById = new Map<string, (typeof availableDeliveryOrders)[number]>();

		for (const order of visit?.linkedOrders ?? []) {
			ordersById.set(order.id, order);
		}

		for (const order of availableDeliveryOrders) {
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

	const canConfirmDelivery =
		isActiveDeliveryVisit &&
		selectedOrderIds.length > 0 &&
		scannedDeliveredOrderIds.length === selectedOrderIds.length &&
		Boolean(formState.result.trim());

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
				label: "Dia planificado",
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
				label: "Ubicacion",
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
						? `${formatTimeLabel(visit.client.visit_window_start_time)} - ${formatTimeLabel(visit.client.visit_window_end_time)}`
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

	function toggleOrderSelection(orderId: string) {
		setSelectedOrderIds((currentOrderIds) =>
			currentOrderIds.includes(orderId)
				? currentOrderIds.filter((currentOrderId) => currentOrderId !== orderId)
				: [...currentOrderIds, orderId],
		);
	}

	function buildDeliveredOrderQrs() {
		return deliveredOrderQrInput
			.split(/\r?\n/)
			.map((value) => value.trim())
			.filter(Boolean);
	}

	function handleDetectedQr(rawValue: string) {
		const normalizedRawValue = String(rawValue ?? "").trim();
		const orderId = extractOrderIdFromQrValue(normalizedRawValue);

		if (!orderId) {
			return {
				accepted: false,
				message:
					"El QR escaneado no tiene un formato reconocido para pedidos.",
			};
		}

		if (selectedOrderIds.length > 0 && !selectedOrderIds.includes(orderId)) {
			return {
				accepted: false,
				message:
					"El QR escaneado no pertenece a ninguno de los pedidos vinculados a este reparto.",
			};
		}

		const currentValues = buildDeliveredOrderQrs();
		const currentOrderIds = normalizeOrderQrValues(currentValues);

		if (currentOrderIds.includes(orderId)) {
			return {
				accepted: false,
				message: "Ese paquete ya estaba escaneado.",
			};
		}

		const nextValues = [...currentValues, normalizedRawValue];
		const nextRecognizedCount = normalizeOrderQrValues(nextValues).filter((value) =>
			selectedOrderIds.includes(value),
		).length;
		const expectedCount = selectedOrderIds.length;

		setDeliveredOrderQrInput(nextValues.join("\n"));
		setQrScanFeedback(
			expectedCount > 0 && nextRecognizedCount >= expectedCount
				? "Todos los paquetes vinculados al reparto ya han sido escaneados."
				: `QR anadido correctamente (${nextRecognizedCount}/${expectedCount}).`,
		);

		return {
			accepted: true,
			message:
				expectedCount > 0 && nextRecognizedCount >= expectedCount
					? "Todos los paquetes vinculados al reparto ya han sido escaneados."
					: `QR anadido correctamente (${nextRecognizedCount}/${expectedCount}).`,
			stop: expectedCount > 0 && nextRecognizedCount >= expectedCount,
		};
	}

	async function handleConfirmDelivery() {
		if (!isActiveDeliveryVisit) {
			return;
		}

		if (selectedOrderIds.length === 0) {
			setSubmissionError(
				"Un reparto activo debe tener al menos un pedido confirmado vinculado antes de poder confirmarse.",
			);
			return;
		}

		if (!formState.result.trim()) {
			setSubmissionError(
				"Antes de confirmar la entrega debes indicar un resultado de la visita.",
			);
			return;
		}

		if (scannedDeliveredOrderIds.length !== selectedOrderIds.length) {
			setSubmissionError(
				"Debes escanear el QR de todos los pedidos vinculados antes de confirmar la entrega.",
			);
			return;
		}

		try {
			setSaving(true);
			setSuccess("");
			setSubmissionError("");

			const visitData = await save({
				deliveredOrderQrs: buildDeliveredOrderQrs(),
				scheduledForDate: formState.scheduledForDate,
				visitTypeId: Number(formState.visitTypeId),
				statusId: 2,
				notes: formState.notes,
				result: formState.result,
				orderIds: selectedOrderIds,
			});

			if (visitData) {
				setSuccess("Entrega confirmada correctamente.");
				setScannerOpen(false);
			}
		} catch (err) {
			console.error("[CommercialVisitDetail][confirm-delivery] error:", err);
			setSubmissionError(
				err instanceof Error
					? err.message
					: "No se pudo confirmar la entrega.",
			);
		} finally {
			setSaving(false);
		}
	}

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();

		if (
			isDeliveryVisit &&
			formState.statusId !== "3" &&
			selectedOrderIds.length === 0
		) {
			setSubmissionError(
				"Un reparto activo debe tener al menos un pedido confirmado vinculado. Selecciona un pedido o cancela la visita.",
			);
			return;
		}

		if (
			isDeliveryVisit &&
			visit?.status_id !== 2 &&
			formState.statusId === "2" &&
			buildDeliveredOrderQrs().length === 0
		) {
			setSubmissionError(
				"Antes de completar el reparto debes escanear o pegar el QR de todos los paquetes entregados.",
			);
			return;
		}

		try {
			setSaving(true);
			setSuccess("");
			setSubmissionError("");

			const visitData = await save({
				deliveredOrderQrs: isDeliveryVisit ? buildDeliveredOrderQrs() : [],
				scheduledForDate: formState.scheduledForDate,
				visitTypeId: Number(formState.visitTypeId),
				statusId: Number(formState.statusId),
				notes: formState.notes,
				result: formState.result,
				orderIds: isDeliveryVisit ? selectedOrderIds : [],
			});

			if (visitData) {
				setSuccess("Visita actualizada correctamente.");
			}
		} catch (err) {
			console.error("[CommercialVisitDetail][PATCH] error:", err);
			setSubmissionError(
				err instanceof Error
					? err.message
					: "No se pudo actualizar la visita.",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<PageTransition>
			<div className="space-y-4">
				<div className="glass-card rounded-3xl border border-white/30 bg-white/75 p-5 shadow-xl backdrop-blur sm:p-6">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
						<div className="min-w-0">
							<H1Title
								title="Detalle de visita"
								subtitle="Consulta la visita y abre solo los bloques que necesites."
							/>
							{visit ? (
								<div className="mt-4 flex flex-wrap items-center gap-3">
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
							) : null}
						</div>

					</div>
				</div>

				{success ? (
					<section className="glass-card rounded-3xl border border-emerald-200 bg-emerald-50/90 p-4 text-sm font-medium text-emerald-700 shadow-sm">
						{success}
					</section>
				) : null}

				{submissionError ? (
					<section className="glass-card rounded-3xl border border-red-200 bg-red-50/90 p-4 text-sm font-medium text-red-700 shadow-sm">
						{submissionError}
					</section>
				) : null}

				{loading ? (
					<section className="glass-card rounded-3xl border border-white/30 bg-white/70 p-6 shadow-xl backdrop-blur">
						<p className="text-sm text-slate-600">Cargando visita...</p>
					</section>
				) : null}

				{!loading && error ? (
					<section className="glass-card rounded-3xl border border-red-200 bg-red-50/80 p-6 shadow-xl backdrop-blur">
						<h2 className="text-lg font-semibold text-red-700">
							{visit
								? "No se pudieron guardar los cambios"
								: "No se pudo cargar la visita"}
						</h2>
						<p className="mt-2 text-sm text-red-600">{error}</p>
					</section>
				) : null}

				{!loading && !error && visit ? (
					<>
						<CollapsibleSection
							title="Información de la visita"
							description="Fecha, tipo, estado, notas y resultado."
						>
							<DataTable<InfoRow>
								data={visitRows}
								columns={infoColumns}
								getRowKey={(item: InfoRow) => item.id}
								emptyMessage="No hay datos de la visita."
							/>
						</CollapsibleSection>


						{isDeliveryVisit ? (
							<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
								<div className="flex flex-col gap-2">
									<h2 className="text-lg font-semibold text-slate-900">
										Pedidos vinculados al reparto
									</h2>
									<p className="text-sm text-slate-600">
										Selecciona los pedidos confirmados que se entregaran en esta
										visita. Al completar el reparto, esos pedidos pasaran
										automáticamente a estado entregado.
									</p>
								</div>

								{deliveryOrdersForDisplay.length === 0 ? (
									<div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
										No hay pedidos confirmados disponibles para este cliente en
										este momento.
									</div>
								) : (
									<div className="mt-5 space-y-3">
										{deliveryOrdersForDisplay.map((order) => {
											const isSelected = selectedOrderIds.includes(order.id);

											return (
												<label
													key={order.id}
													className={`flex cursor-pointer flex-col gap-3 rounded-2xl border px-4 py-4 transition ${
														isSelected
															? "border-sky-300 bg-sky-50"
															: "border-slate-200 bg-white"
													} ${
														deliveryOrdersLocked
															? "cursor-not-allowed opacity-80"
															: "hover:border-slate-300"
													}`}
												>
													<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
														<div className="flex items-start gap-3">
															<input
																type="checkbox"
																checked={isSelected}
																onChange={() => toggleOrderSelection(order.id)}
																disabled={deliveryOrdersLocked}
																className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
															/>

															<div>
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

																<p className="mt-2 text-sm text-slate-600">
																	Registrado el{" "}
																	<span className="font-medium text-slate-900">
																		{formatDateTime(order.created_at)}
																	</span>
																</p>

																{order.notes ? (
																	<p className="mt-2 text-sm leading-6 text-slate-600">
																		{order.notes}
																	</p>
																) : null}
															</div>
														</div>

														<div className="grid gap-2 sm:min-w-[180px]">
															<div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
																<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
																	Importe
																</p>
																<p className="mt-1 text-sm font-semibold text-slate-900">
																	{formatOrderCurrency(order.total_amount)}
																</p>
															</div>
															<div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
																<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
																	Líneas
																</p>
																<p className="mt-1 text-sm font-semibold text-slate-900">
																	{order.line_count}
																</p>
															</div>
														</div>
													</div>
												</label>
											);
										})}
									</div>
								)}
							</section>
						) : null}

						<CollapsibleSection
							title="Acciones de la visita"
							description="Reprograma, actualiza, escanea QR o confirma la entrega cuando lo necesites."
						>
							<SafeForm onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
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
										disabled={!canEditPlanning}
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

											if (nextVisitTypeId !== "1") {
												setSelectedOrderIds([]);
											}
										}}
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
										placeholder="Conclusiones de la visita, acuerdos alcanzados, próximos pasos..."
									/>
								</div>

								{isActiveDeliveryVisit ? (
									<div className="md:col-span-2">
										<label
											htmlFor="visit-delivered-order-qrs"
											className="mb-2 block text-sm font-medium text-slate-700"
										>
											QR de paquetes entregados
										</label>
										<textarea
											id="visit-delivered-order-qrs"
											value={deliveredOrderQrInput}
											onChange={(event) => {
												setDeliveredOrderQrInput(event.target.value);
												setQrScanFeedback("");
											}}
											rows={4}
											className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
											placeholder="Escanea o pega un QR por línea antes de completar el reparto"
										/>
										<p className="mt-2 text-sm text-slate-600">
											Debes aportar un QR por cada pedido vinculado al reparto.
											También puedes pegar el valor completo del código si el
											lector lo envia como texto.
										</p>
										<p className="mt-2 text-sm font-medium text-slate-700">
											QR reconocidos: {scannedDeliveredOrderIds.length}/
											{selectedOrderIds.length}
										</p>
										<div className="mt-4 flex flex-wrap gap-3">
											<button
												type="button"
												onClick={() => setScannerOpen(true)}
												disabled={selectedOrderIds.length === 0}
												className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
											>
												Escanear QR
											</button>
											<button
												type="button"
												onClick={() => void handleConfirmDelivery()}
												disabled={!canConfirmDelivery || saving}
												className="inline-flex items-center justify-center rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
											>
												{saving ? "Confirmando entrega..." : "Confirmar entrega"}
											</button>
										</div>
										<p className="mt-2 text-sm text-slate-600">
											El boton grande de confirmar entrega valida los QR
											escaneados y completa el reparto sin depender del selector
											de estado.
										</p>
										{qrScanFeedback ? (
											<p className="mt-2 text-sm text-emerald-700">
												{qrScanFeedback}
											</p>
										) : null}
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

									{success ? (
										<p className="text-sm font-medium text-emerald-700">
											{success}
										</p>
									) : null}
								</div>
							</SafeForm>
						</CollapsibleSection>

						<CollapsibleSection
							title="Datos del cliente"
							description="Contacto, ubicacion y franja de visita."
						>
							<DataTable<InfoRow>
								data={clientRows}
								columns={infoColumns}
								getRowKey={(item: InfoRow) => item.id}
								emptyMessage="No hay datos del cliente."
							/>
						</CollapsibleSection>

						<CollapsibleSection
							title="Datos del comercial"
							description="Usuario, código interno y territorio."
						>
							<DataTable<InfoRow>
								data={commercialRows}
								columns={infoColumns}
								getRowKey={(item: InfoRow) => item.id}
								emptyMessage="No hay datos del comercial."
							/>
						</CollapsibleSection>

					</>
				) : null}
			</div>

			<QrCameraScanner
				isOpen={scannerOpen}
				onClose={() => setScannerOpen(false)}
				onDetected={handleDetectedQr}
			/>
		</PageTransition>
	);
}
