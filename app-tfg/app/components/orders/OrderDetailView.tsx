"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";
import type { OrderDetail } from "@/lib/contracts/order";
import { ROLE_IDS } from "@/lib/typeorm/constants/catalog-ids";
import { formatDateTime } from "@/lib/utils/user-utils";
import {
	buildOrderLinePromotionLabel,
	formatOrderCents,
	formatOrderCurrency,
	getOrderDiscountSummary,
	getOrderLineDiscountCents,
	getOrderLineSubtotalCents,
	getOrderPackageCount,
	getOrderPaymentMethodLabel,
	getOrderPaymentStatusClasses,
	getOrderStatusClasses,
	hasOrderLineDiscount,
} from "./order-ui";

type RelatedLink = {
	label: string;
	href: string;
};

type Props = {
	title: string;
	subtitle: string;
	initialDetail: OrderDetail;
	mode: "client" | "commercial" | "admin";
	updateApiPath?: string | null;
	paymentApiPath?: string | null;
	qrPdfHref?: string | null;
	relatedLinks?: RelatedLink[];
};

function parseOrderAmount(value: string | null | undefined) {
	const parsed = Number(value);

	return Number.isFinite(parsed) ? parsed : 0;
}

function isPartiallyPaid(order: OrderDetail["order"]) {
	return (
		parseOrderAmount(order.paid_amount) > 0 &&
		parseOrderAmount(order.pending_amount) > 0
	);
}

function getPaymentStatusLabel(order: OrderDetail["order"]) {
	return isPartiallyPaid(order) ? "Parcial" : order.payment_status_name;
}

function getPaymentStatusClass(order: OrderDetail["order"]) {
	return isPartiallyPaid(order)
		? "bg-sky-100 text-sky-700"
		: getOrderPaymentStatusClasses(order.payment_status_code);
}

export default function OrderDetailView({
	title,
	subtitle,
	initialDetail,
	mode,
	updateApiPath = null,
	paymentApiPath = null,
	qrPdfHref = null,
	relatedLinks = [],
}: Props) {
	const [detail, setDetail] = useState(initialDetail);
	const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
	const [updatingPaymentStatusId, setUpdatingPaymentStatusId] = useState<
		number | null
	>(null);
	const [registeringPayment, setRegisteringPayment] = useState(false);
	const [paymentAmount, setPaymentAmount] = useState(
		initialDetail.order.pending_amount,
	);
	const [paymentMethod, setPaymentMethod] = useState(
		initialDetail.order.payment_method ?? "cash",
	);
	const [paymentNotes, setPaymentNotes] = useState(
		initialDetail.order.payment_notes ?? "",
	);
	const [isLinesModalOpen, setIsLinesModalOpen] = useState(false);
	const [isMounted, setIsMounted] = useState(false);
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	const order = detail.order;
	const discountSummary = getOrderDiscountSummary(order);
	const deliveryPackageCount = order.deliveries.reduce(
		(total, delivery) => total + Number(delivery.package_count ?? 0),
		0,
	);
	const packageCount =
		deliveryPackageCount > 0 ? deliveryPackageCount : getOrderPackageCount(order);
	const isBusy =
		updatingStatusId !== null ||
		updatingPaymentStatusId !== null ||
		registeringPayment;
	const canUpdateStatus =
		Boolean(updateApiPath) && detail.availableStatusTransitions.length > 0;
	const canUpdatePayment =
		Boolean(updateApiPath) &&
		!paymentApiPath &&
		order.status_code === "delivered" &&
		detail.availablePaymentTransitions.length > 0;
	const canRegisterPayment =
		Boolean(paymentApiPath) &&
		order.status_code === "delivered" &&
		parseOrderAmount(order.pending_amount) > 0;
	const markAsPaidOption = detail.availablePaymentTransitions.find(
		(option) => option.code === "paid",
	);
	const markAsPendingOption = detail.availablePaymentTransitions.find(
		(option) => option.code === "pending",
	);
	const createdByCommercial =
		order.created_by_user_role_id === ROLE_IDS.COMMERCIAL;
	const showDeliveryState =
		order.deliveries.length > 0 ||
		Boolean(order.delivery_visit_id) ||
		order.status_code === "confirmed";

	useEffect(() => {
		setIsMounted(true);
	}, []);

	useEffect(() => {
		setPaymentAmount(
			parseOrderAmount(detail.order.pending_amount) > 0
				? detail.order.pending_amount
				: "",
		);
		setPaymentMethod(detail.order.payment_method ?? "cash");
		setPaymentNotes(detail.order.payment_notes ?? "");
	}, [
		detail.order.id,
		detail.order.pending_amount,
		detail.order.payment_method,
		detail.order.payment_notes,
		detail.order.payment_status_id,
	]);

	async function handleStatusChange(statusId: number) {
		if (!updateApiPath) {
			return;
		}

		setFeedback(null);
		setUpdatingStatusId(statusId);

		try {
			const response = await fetch(updateApiPath, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					statusId,
				}),
			});
			const data = (await response.json().catch(() => null)) as
				| OrderDetail
				| { error?: string }
				| null;

			if (!response.ok || !data || !("order" in data)) {
				setFeedback({
					type: "error",
					message:
						(data && "error" in data && data.error) ||
						"No se ha podido actualizar el estado del pedido.",
				});
				return;
			}

			setDetail(data);
			setFeedback({
				type: "success",
				message: `Estado actualizado a ${data.order.status_name}.`,
			});
		} catch (error) {
			console.error("[orders][detail][status] error:", error);
			setFeedback({
				type: "error",
				message:
					"Ha ocurrido un error inesperado al actualizar el estado del pedido.",
			});
		} finally {
			setUpdatingStatusId(null);
		}
	}

	async function handlePaymentChange(paymentStatusId: number) {
		if (!updateApiPath) {
			return;
		}

		const nextPaymentStatus = detail.availablePaymentTransitions.find(
			(option) => option.id === paymentStatusId,
		);

		if (!nextPaymentStatus) {
			return;
		}

		if (nextPaymentStatus.code === "paid" && !String(paymentMethod).trim()) {
			setFeedback({
				type: "error",
				message: "Selecciona primero el método de cobro utilizado.",
			});
			return;
		}

		setFeedback(null);
		setUpdatingPaymentStatusId(paymentStatusId);

		try {
			const response = await fetch(updateApiPath, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					paymentStatusId,
					paymentMethod:
						nextPaymentStatus.code === "paid" ? paymentMethod : null,
					paymentNotes,
				}),
			});
			const data = (await response.json().catch(() => null)) as
				| OrderDetail
				| { error?: string }
				| null;

			if (!response.ok || !data || !("order" in data)) {
				setFeedback({
					type: "error",
					message:
						(data && "error" in data && data.error) ||
						"No se ha podido actualizar el estado del cobro.",
				});
				return;
			}

			setDetail(data);
			setFeedback({
				type: "success",
				message: `Cobro actualizado a ${data.order.payment_status_name}.`,
			});
		} catch (error) {
			console.error("[orders][detail][payment] error:", error);
			setFeedback({
				type: "error",
				message:
					"Ha ocurrido un error inesperado al actualizar el cobro del pedido.",
			});
		} finally {
			setUpdatingPaymentStatusId(null);
		}
	}

	async function handleRegisterPayment() {
		if (!paymentApiPath) {
			return;
		}

		const parsedAmount = Number(String(paymentAmount).replace(",", "."));

		if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
			setFeedback({
				type: "error",
				message: "Indica un importe de cobro mayor que cero.",
			});
			return;
		}

		if (parsedAmount > parseOrderAmount(order.pending_amount)) {
			setFeedback({
				type: "error",
				message: "El importe no puede superar el pendiente de cobro.",
			});
			return;
		}

		if (!String(paymentMethod).trim()) {
			setFeedback({
				type: "error",
				message: "Selecciona primero el método de cobro utilizado.",
			});
			return;
		}

		setFeedback(null);
		setRegisteringPayment(true);

		try {
			const response = await fetch(paymentApiPath, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					amount: paymentAmount,
					paymentMethod,
					paymentNotes,
				}),
			});
			const data = (await response.json().catch(() => null)) as
				| OrderDetail
				| { error?: string }
				| null;

			if (!response.ok || !data || !("order" in data)) {
				setFeedback({
					type: "error",
					message:
						(data && "error" in data && data.error) ||
						"No se ha podido registrar el pago del pedido.",
				});
				return;
			}

			setDetail(data);
			setPaymentNotes("");
			setFeedback({
				type: "success",
				message: `Pago registrado por ${formatOrderCurrency(String(paymentAmount))}.`,
			});
		} catch (error) {
			console.error("[orders][detail][payment-register] error:", error);
			setFeedback({
				type: "error",
				message:
					"Ha ocurrido un error inesperado al registrar el pago del pedido.",
			});
		} finally {
			setRegisteringPayment(false);
		}
	}

	return (
		<PageTransition>
			<div className="space-y-6">
				<H1Title title={title} subtitle={subtitle} />

				{feedback ? (
					<div
						className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
							feedback.type === "success"
								? "border-emerald-200 bg-emerald-50 text-emerald-700"
								: "border-rose-200 bg-rose-50 text-rose-700"
						}`}
					>
						{feedback.message}
					</div>
				) : null}

				<section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
					<div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
						<div className="min-w-0 space-y-3">
							<div className="flex flex-wrap items-center gap-2">
								<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
									Pedido {order.id.slice(0, 8)}
								</span>
								<span
									className={`rounded-full px-3 py-1 text-xs font-semibold ${getOrderStatusClasses(
										order.status_code,
									)}`}
								>
									{order.status_name}
								</span>
								{order.status_code === "delivered" ? (
									<span
										className={`rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStatusClass(
											order,
										)}`}
									>
										{getPaymentStatusLabel(order)}
									</span>
								) : null}
								{mode === "client" && createdByCommercial ? (
									<span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
										Gestionado por {order.created_by_user_name}
									</span>
								) : null}
								<span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold text-fuchsia-700">
									{order.client_name}
								</span>
								<span
									className={`rounded-full px-3 py-1 text-xs font-semibold ${
										order.fulfillment_method === "agency"
											? "bg-amber-100 text-amber-800"
											: "bg-sky-100 text-sky-800"
									}`}
								>
									{order.fulfillment_method === "agency"
										? "Agencia"
										: "Comercial"}
								</span>
							</div>

							<p className="text-sm text-slate-600">
								Creado el{" "}
								<span className="font-medium text-slate-900">
									{formatDateTime(order.created_at)}
								</span>{" "}
								por{" "}
								<span className="font-medium text-slate-900">
									{order.created_by_user_name}
								</span>
							</p>

							<p className="max-w-3xl text-sm leading-6 text-slate-600">
								{order.notes || "Este pedido no tiene observaciones registradas."}
							</p>

							{mode === "client" && createdByCommercial ? (
								<p className="text-sm text-slate-600">
									Comercial responsable:{" "}
									<span className="font-medium text-slate-900">
										{order.created_by_user_name}
									</span>
								</p>
							) : null}
						</div>

						<div className="grid gap-2 sm:grid-cols-3 xl:w-[560px]">
							<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
								<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
									Total
								</p>
								<p className="mt-1 text-lg font-semibold text-slate-900">
									{formatOrderCurrency(order.total_amount)}
								</p>
								{discountSummary.hasDiscounts ? (
									<p className="mt-1 text-xs font-semibold text-emerald-700">
										Promo -{" "}
										{formatOrderCents(discountSummary.totalDiscountCents)}
									</p>
								) : null}
								{order.fulfillment_method === "agency" ? (
									<p className="mt-1 text-xs font-semibold text-amber-700">
										Agencia + {formatOrderCurrency(order.agency_delivery_fee)}
									</p>
								) : null}
							</div>
							<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
								<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
									Bultos
								</p>
								<p className="mt-1 text-lg font-semibold text-slate-900">
									{packageCount}
								</p>
							</div>
							<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
								<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
									Actualizado
								</p>
								<p className="mt-1 text-sm font-semibold text-slate-900">
									{formatDateTime(order.updated_at)}
								</p>
							</div>
						</div>
					</div>

					{showDeliveryState ? (
						<div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
							<div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
								<span className="font-semibold text-slate-900">Reparto</span>
								{order.deliveries.length > 0 ? (
									order.deliveries.map((delivery) => (
										<span
											key={delivery.id}
											className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700"
										>
											{delivery.id.slice(0, 8)} · {delivery.status_name} ·{" "}
											{delivery.package_count} bulto
											{delivery.package_count === 1 ? "" : "s"}
										</span>
									))
								) : order.delivery_visit_id ? (
									<>
										<span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
											Visita {order.delivery_visit_id.slice(0, 8)}
										</span>
										<span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
											{order.delivery_visit_scheduled_for_date || "Sin fecha"}
										</span>
										<span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700">
											{order.delivery_visit_status_name || "Sin estado"}
										</span>
									</>
								) : (
									<span>Confirmado sin reparto asignado.</span>
								)}
							</div>
						</div>
					) : null}

					<div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
						{mode === "commercial" && order.deliveries.length > 0
							? order.deliveries.map((delivery) => (
									<a
										key={delivery.id}
										href={`/api/commercial/order-deliveries/${delivery.id}/qr-pdf`}
										download
										className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
									>
										{delivery.fulfillment_method === "agency"
											? "Etiqueta agencia"
											: "Etiqueta QR"}{" "}
										{delivery.id.slice(0, 8)}
									</a>
								))
							: null}

						{mode !== "client" && order.deliveries.length === 0 && qrPdfHref ? (
							<a
								href={qrPdfHref}
								download
								className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
							>
								Descargar QR
							</a>
						) : null}

						{relatedLinks.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
							>
								{link.label}
							</Link>
						))}

						<button
							type="button"
							onClick={() => setIsLinesModalOpen(true)}
							className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
						>
							Ver bultos ({packageCount})
						</button>

						{canUpdateStatus
							? detail.availableStatusTransitions.map((statusOption) => (
									<button
										key={statusOption.id}
										type="button"
										onClick={() => handleStatusChange(statusOption.id)}
										disabled={isBusy}
										className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
									>
										{updatingStatusId === statusOption.id
											? "Actualizando..."
											: `Marcar como ${statusOption.name}`}
									</button>
								))
							: null}
					</div>
				</section>

				<section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
					<div className="flex flex-col gap-1">
						<p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
							Cobro
						</p>
						<h2 className="text-xl font-semibold text-slate-900">
							Seguimiento del cobro
						</h2>
					</div>

					{order.status_code !== "delivered" ? (
						<div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-4 text-sm text-slate-600">
							Este pedido todavia no consta como entregado, asi que el cobro
							permanece en espera.
						</div>
					) : (
						<div className="mt-4 space-y-4">
							<div className="grid gap-3 md:grid-cols-4">
								<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
									<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
										Estado
									</p>
									<p
										className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPaymentStatusClass(
											order,
										)}`}
									>
										{getPaymentStatusLabel(order)}
									</p>
								</div>
								<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
									<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
										Total
									</p>
									<p className="mt-2 text-lg font-semibold text-slate-900">
										{formatOrderCurrency(order.total_amount)}
									</p>
								</div>
								<div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
									<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
										Cobrado
									</p>
									<p className="mt-2 text-lg font-semibold text-emerald-800">
										{formatOrderCurrency(order.paid_amount)}
									</p>
								</div>
								<div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
									<p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
										Pendiente
									</p>
									<p className="mt-2 text-lg font-semibold text-amber-800">
										{formatOrderCurrency(order.pending_amount)}
									</p>
								</div>
							</div>

							<div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<h3 className="text-base font-semibold text-slate-900">
										Registrar pago
									</h3>

									{canRegisterPayment ? (
										<form
											className="mt-4 grid gap-3 lg:grid-cols-[180px_220px_minmax(0,1fr)]"
											onSubmit={(event) => {
												event.preventDefault();
												void handleRegisterPayment();
											}}
										>
											<div>
												<label
													htmlFor="order-payment-amount"
													className="mb-2 block text-sm font-medium text-slate-700"
												>
													Importe
												</label>
												<input
													id="order-payment-amount"
													type="number"
													min="0.01"
													max={order.pending_amount}
													step="0.01"
													value={paymentAmount}
													onChange={(event) =>
														setPaymentAmount(event.target.value)
													}
													disabled={isBusy}
													className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
												/>
											</div>

											<div>
												<label
													htmlFor="order-payment-method"
													className="mb-2 block text-sm font-medium text-slate-700"
												>
													Método
												</label>
												<select
													id="order-payment-method"
													value={paymentMethod}
													onChange={(event) =>
														setPaymentMethod(event.target.value)
													}
													disabled={isBusy}
													className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
												>
													<option value="cash">Efectivo</option>
													<option value="card">Tarjeta</option>
													<option value="transfer">Transferencia</option>
													<option value="other">Otro</option>
												</select>
											</div>

											<div>
												<label
													htmlFor="order-payment-notes"
													className="mb-2 block text-sm font-medium text-slate-700"
												>
													Observaciones
												</label>
												<textarea
													id="order-payment-notes"
													value={paymentNotes}
													onChange={(event) =>
														setPaymentNotes(event.target.value)
													}
													rows={2}
													disabled={isBusy}
													placeholder="Comprobante, incidencia o contexto adicional"
													className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
												/>
											</div>

											<div className="lg:col-span-3">
												<button
													type="submit"
													disabled={isBusy}
													className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
												>
													{registeringPayment
														? "Registrando pago..."
														: "Registrar pago"}
												</button>
											</div>
										</form>
									) : canUpdatePayment ? (
										<div className="mt-3 flex flex-wrap gap-2">
											{markAsPaidOption ? (
												<button
													type="button"
													onClick={() =>
														handlePaymentChange(markAsPaidOption.id)
													}
													disabled={isBusy}
													className="rounded-2xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
												>
													{updatingPaymentStatusId === markAsPaidOption.id
														? "Registrando cobro..."
														: "Marcar como cobrado"}
												</button>
											) : null}

											{markAsPendingOption ? (
												<button
													type="button"
													onClick={() =>
														handlePaymentChange(markAsPendingOption.id)
													}
													disabled={isBusy}
													className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
												>
													{updatingPaymentStatusId === markAsPendingOption.id
														? "Actualizando cobro..."
														: "Marcar cobro como pendiente"}
												</button>
											) : null}
										</div>
									) : (
										<p className="mt-3 text-sm text-slate-600">
											{order.payment_status_code === "paid"
												? "Pedido cobrado por completo."
												: "No hay acciones de cobro pendientes."}
										</p>
									)}
								</div>

								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<h3 className="text-base font-semibold text-slate-900">
										Historial de pagos
									</h3>

									{order.payments.length > 0 ? (
										<div className="mt-3 grid gap-2">
											{order.payments.map((payment) => (
												<div
													key={payment.id}
													className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
												>
													<div className="flex flex-wrap items-center justify-between gap-2">
														<p className="text-base font-semibold text-slate-900">
															{formatOrderCurrency(payment.amount)}
														</p>
														<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
															{getOrderPaymentMethodLabel(
																payment.payment_method,
															)}
														</span>
													</div>
													<p className="mt-2 text-sm text-slate-600">
														{formatDateTime(payment.paid_at)}
														{" · "}
														{payment.registered_by_user_name ||
															"Usuario no disponible"}
													</p>
													{payment.notes ? (
														<p className="mt-2 text-sm leading-6 text-slate-600">
															{payment.notes}
														</p>
													) : null}
												</div>
											))}
										</div>
									) : (
										<p className="mt-3 text-sm text-slate-600">
											Todavía no hay pagos registrados para este pedido.
										</p>
									)}
								</div>
							</div>
						</div>
					)}
				</section>

				{isMounted && isLinesModalOpen
					? createPortal(
							<div
								className="app-modal-overlay z-[120] px-4 py-6"
								role="dialog"
								aria-modal="true"
								aria-labelledby="order-lines-modal-title"
							>
								<div className="max-h-[86vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl">
									<div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
										<div>
											<p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
												Detalle
											</p>
											<h2
												id="order-lines-modal-title"
												className="text-xl font-semibold text-slate-900"
											>
												Bultos del pedido
											</h2>
										</div>
										<button
											type="button"
											onClick={() => setIsLinesModalOpen(false)}
											className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
										>
											Cerrar
										</button>
									</div>

									<div className="max-h-[68vh] overflow-y-auto p-5">
										<div className="grid gap-3 md:grid-cols-2">
											{order.lines.map((line) => (
												<div
													key={line.id}
													className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
												>
													<div className="flex flex-wrap items-center gap-2">
														<span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
															{line.order_reference}
														</span>
														{line.color_reference_code ? (
															<span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
																Tono {line.color_reference_code}
															</span>
														) : null}
													</div>
													<p className="mt-3 text-base font-semibold text-slate-900">
														{line.product_name}
													</p>
													{line.color_reference_name ? (
														<p className="mt-1 text-sm text-slate-600">
															{line.color_reference_name}
														</p>
													) : null}

													<div className="mt-3 grid gap-2 sm:grid-cols-3">
														<div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
															<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
																Cantidad
															</p>
															<p className="mt-1 text-sm font-semibold text-slate-900">
																{line.quantity}
															</p>
														</div>
														<div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
															<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
																Gama
															</p>
															<p className="mt-1 text-sm font-semibold text-slate-900">
																{line.product_line_name || "-"}
															</p>
														</div>
														<div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
															<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
																Final
															</p>
															<p className="mt-1 text-sm font-semibold text-slate-900">
																{formatOrderCurrency(line.line_total)}
															</p>
														</div>
													</div>

													{hasOrderLineDiscount(line) ? (
														<div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
															<p className="font-semibold">
																{buildOrderLinePromotionLabel(line)}
															</p>
															<p className="mt-1">
																Antes{" "}
																{formatOrderCents(
																	getOrderLineSubtotalCents(line),
																)}
																{" - "}ahorro{" "}
																{formatOrderCents(
																	getOrderLineDiscountCents(line),
																)}
																{" - "}final{" "}
																{formatOrderCurrency(line.line_total)}
															</p>
														</div>
													) : null}
												</div>
											))}
										</div>
									</div>
								</div>
							</div>,
							document.body,
						)
					: null}
			</div>
		</PageTransition>
	);
}
