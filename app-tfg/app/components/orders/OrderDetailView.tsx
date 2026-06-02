"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";
import type { OrderDetail } from "@/lib/contracts/order";
import { buildOrderQrImageUrl, buildOrderQrPayload } from "@/lib/orders/qr";
import { ROLE_IDS } from "@/lib/typeorm/constants/catalog-ids";
import { formatDateTime } from "@/lib/utils/user-utils";
import {
	formatOrderCurrency,
	getOrderPaymentMethodLabel,
	getOrderPaymentStatusClasses,
	getOrderStatusClasses,
} from "./order-ui";

type RelatedLink = {
	label: string;
	href: string;
};

type Props = {
	title: string;
	subtitle: string;
	backHref: string;
	backLabel: string;
	initialDetail: OrderDetail;
	mode: "client" | "commercial" | "admin";
	updateApiPath?: string | null;
	relatedLinks?: RelatedLink[];
};

export default function OrderDetailView({
	title,
	subtitle,
	backHref,
	backLabel,
	initialDetail,
	mode,
	updateApiPath = null,
	relatedLinks = [],
}: Props) {
	const [detail, setDetail] = useState(initialDetail);
	const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
	const [updatingPaymentStatusId, setUpdatingPaymentStatusId] = useState<
		number | null
	>(null);
	const [paymentMethod, setPaymentMethod] = useState(
		initialDetail.order.payment_method ?? "cash",
	);
	const [paymentNotes, setPaymentNotes] = useState(
		initialDetail.order.payment_notes ?? "",
	);
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	const order = detail.order;
	const isBusy = updatingStatusId !== null || updatingPaymentStatusId !== null;
	const canUpdateStatus =
		Boolean(updateApiPath) && detail.availableStatusTransitions.length > 0;
	const canUpdatePayment =
		Boolean(updateApiPath) &&
		order.status_code === "delivered" &&
		detail.availablePaymentTransitions.length > 0;
	const markAsPaidOption = detail.availablePaymentTransitions.find(
		(option) => option.code === "paid",
	);
	const markAsPendingOption = detail.availablePaymentTransitions.find(
		(option) => option.code === "pending",
	);
	const createdByCommercial =
		order.created_by_user_role_id === ROLE_IDS.COMMERCIAL;

	useEffect(() => {
		setPaymentMethod(detail.order.payment_method ?? "cash");
		setPaymentNotes(detail.order.payment_notes ?? "");
	}, [
		detail.order.id,
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
				message: "Selecciona primero el metodo de cobro utilizado.",
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

	return (
		<PageTransition>
			<div className="space-y-6">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<H1Title title={title} subtitle={subtitle} />

					<Link
						href={backHref}
						className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
					>
						{backLabel}
					</Link>
				</div>

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

				<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="space-y-3">
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
										className={`rounded-full px-3 py-1 text-xs font-semibold ${getOrderPaymentStatusClasses(
											order.payment_status_code,
										)}`}
									>
										{order.payment_status_name}
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

							{order.notes ? (
								<p className="max-w-3xl text-sm leading-6 text-slate-600">
									{order.notes}
								</p>
							) : (
								<p className="text-sm text-slate-500">
									Este pedido no tiene observaciones registradas.
								</p>
							)}

							{mode === "client" && createdByCommercial ? (
								<p className="text-sm text-slate-600">
									Comercial responsable:{" "}
									<span className="font-medium text-slate-900">
										{order.created_by_user_name}
									</span>
								</p>
							) : null}
						</div>

						<div className="grid gap-3 sm:grid-cols-2 lg:w-[360px]">
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
									Importe total
								</p>
								<p className="mt-2 text-lg font-semibold text-slate-900">
									{formatOrderCurrency(order.total_amount)}
								</p>
							</div>
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
									Lineas
								</p>
								<p className="mt-2 text-lg font-semibold text-slate-900">
									{order.line_count}
								</p>
							</div>
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
									Ultima actualizacion
								</p>
								<p className="mt-2 text-sm font-medium text-slate-900">
									{formatDateTime(order.updated_at)}
								</p>
							</div>
						</div>
					</div>
				</section>

				{order.status_code === "confirmed" || order.delivery_visit_id ? (
					<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<div className="flex flex-col gap-2">
							<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
								Entrega
							</p>
							<h2 className="text-2xl font-semibold text-slate-900">
								Estado de reparto
							</h2>
						</div>

						{order.delivery_visit_id ? (
							<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
										Visita
									</p>
									<p className="mt-2 text-sm font-semibold text-slate-900">
										{order.delivery_visit_id.slice(0, 8)}
									</p>
								</div>
								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
										Fecha prevista
									</p>
									<p className="mt-2 text-sm font-semibold text-slate-900">
										{order.delivery_visit_scheduled_for_date || "-"}
									</p>
								</div>
								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
									<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
										Estado de la visita
									</p>
									<p className="mt-2 text-sm font-semibold text-slate-900">
										{order.delivery_visit_status_name || "Sin estado"}
									</p>
								</div>
							</div>
						) : (
							<div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
								Este pedido ya esta confirmado, pero todavia no se ha vinculado
								a una visita de reparto.
							</div>
						)}
					</section>
				) : null}

				{mode !== "client" ? (
					<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<div className="flex flex-col gap-2">
							<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
								Trazabilidad
							</p>
							<h2 className="text-2xl font-semibold text-slate-900">
								QR del paquete
							</h2>
							<p className="text-sm text-slate-600">
								Este QR se puede imprimir o pegar en el paquete para validarlo
								al completar el reparto.
							</p>
						</div>

						<div className="mt-5 grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
							<div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
								{/* The QR comes from a remote generator URL and does not need Next image optimization. */}
								{/* eslint-disable-next-line @next/next/no-img-element */}
								<img
									src={buildOrderQrImageUrl(order.id)}
									alt={`QR del pedido ${order.id}`}
									className="mx-auto h-48 w-48 rounded-2xl bg-white p-2"
								/>
							</div>

							<div className="space-y-4">
								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
										Codigo QR
									</p>
									<p className="mt-2 break-all font-mono text-sm text-slate-900">
										{buildOrderQrPayload(order.id)}
									</p>
								</div>

								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
									Usa este codigo al preparar el paquete. En el cierre del
									reparto, el comercial debe escanear o pegar el valor del QR
									para confirmar la entrega.
								</div>
							</div>
						</div>
					</section>
				) : null}

				<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div className="flex flex-col gap-2">
						<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
							Cobro
						</p>
						<h2 className="text-2xl font-semibold text-slate-900">
							Seguimiento del cobro
						</h2>
						<p className="text-sm text-slate-600">
							El estado de cobro solo puede confirmarse cuando el pedido ya se
							ha entregado.
						</p>
					</div>

					{order.status_code !== "delivered" ? (
						<div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
							Este pedido todavia no consta como entregado, asi que el cobro
							permanece en espera.
						</div>
					) : (
						<>
							<div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
										Estado
									</p>
									<p
										className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getOrderPaymentStatusClasses(
											order.payment_status_code,
										)}`}
									>
										{order.payment_status_name}
									</p>
								</div>
								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
										Metodo
									</p>
									<p className="mt-2 text-sm font-semibold text-slate-900">
										{getOrderPaymentMethodLabel(order.payment_method)}
									</p>
								</div>
								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
										Fecha de cobro
									</p>
									<p className="mt-2 text-sm font-semibold text-slate-900">
										{order.paid_at ? formatDateTime(order.paid_at) : "-"}
									</p>
								</div>
								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
										Registrado por
									</p>
									<p className="mt-2 text-sm font-semibold text-slate-900">
										{order.paid_by_user_name || "-"}
									</p>
								</div>
							</div>

							{order.payment_notes ? (
								<div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-6 text-slate-600">
									<span className="font-semibold text-slate-900">
										Observaciones del cobro:
									</span>{" "}
									{order.payment_notes}
								</div>
							) : null}

							{canUpdatePayment ? (
								<div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
									<div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
										<div>
											<label
												htmlFor="order-payment-method"
												className="mb-2 block text-sm font-medium text-slate-700"
											>
												Metodo de cobro
											</label>
											<select
												id="order-payment-method"
												value={paymentMethod}
												onChange={(event) =>
													setPaymentMethod(event.target.value)
												}
												disabled={isBusy}
												className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
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
												Observaciones del cobro
											</label>
											<textarea
												id="order-payment-notes"
												value={paymentNotes}
												onChange={(event) =>
													setPaymentNotes(event.target.value)
												}
												rows={3}
												disabled={isBusy}
												placeholder="Metodo real usado, incidencia, comprobante o contexto adicional"
												className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100"
											/>
										</div>
									</div>

									<div className="mt-4 flex flex-wrap gap-3">
										{markAsPaidOption ? (
											<button
												type="button"
												onClick={() => handlePaymentChange(markAsPaidOption.id)}
												disabled={isBusy}
												className="rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
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
												className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
											>
												{updatingPaymentStatusId === markAsPendingOption.id
													? "Actualizando cobro..."
													: "Marcar cobro como pendiente"}
											</button>
										) : null}
									</div>
								</div>
							) : null}
						</>
					)}
				</section>

				{canUpdateStatus ? (
					<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<div className="flex flex-col gap-2">
							<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
								Estado
							</p>
							<h2 className="text-2xl font-semibold text-slate-900">
								Siguientes acciones disponibles
							</h2>
							<p className="text-sm text-slate-600">
								El pedido solo permite cambios coherentes con su estado actual.
							</p>
						</div>

						<div className="mt-5 flex flex-wrap gap-3">
							{detail.availableStatusTransitions.map((statusOption) => (
								<button
									key={statusOption.id}
									type="button"
									onClick={() => handleStatusChange(statusOption.id)}
									disabled={isBusy}
									className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
								>
									{updatingStatusId === statusOption.id
										? "Actualizando..."
										: `Marcar como ${statusOption.name}`}
								</button>
							))}
						</div>
					</section>
				) : null}

				<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div className="flex flex-col gap-2">
						<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
							Detalle
						</p>
						<h2 className="text-2xl font-semibold text-slate-900">
							Referencias del pedido
						</h2>
					</div>

					<div className="mt-5 grid gap-3 lg:grid-cols-2">
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
								<div className="mt-3 grid gap-2 sm:grid-cols-2">
									<div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
										<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
											Cantidad
										</p>
										<p className="mt-1 text-sm font-semibold text-slate-900">
											{line.quantity}
										</p>
									</div>
									<div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
										<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
											Linea
										</p>
										<p className="mt-1 text-sm font-semibold text-slate-900">
											{line.product_line_name || "-"}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>
				</section>

				{relatedLinks.length > 0 ? (
					<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<div className="flex flex-col gap-2">
							<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
								Contexto
							</p>
							<h2 className="text-2xl font-semibold text-slate-900">
								Accesos relacionados
							</h2>
						</div>

						<div className="mt-5 flex flex-wrap gap-3">
							{relatedLinks.map((link) => (
								<Link
									key={link.href}
									href={link.href}
									className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
								>
									{link.label}
								</Link>
							))}
						</div>
					</section>
				) : null}
			</div>
		</PageTransition>
	);
}
