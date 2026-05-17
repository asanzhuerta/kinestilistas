"use client";

import Link from "next/link";
import { useState } from "react";
import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";
import type { OrderDetail } from "@/lib/contracts/order";
import { formatDateTime } from "@/lib/utils/user-utils";
import {
	formatOrderCurrency,
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
	updateApiPath?: string | null;
	relatedLinks?: RelatedLink[];
};

export default function OrderDetailView({
	title,
	subtitle,
	backHref,
	backLabel,
	initialDetail,
	updateApiPath = null,
	relatedLinks = [],
}: Props) {
	const [detail, setDetail] = useState(initialDetail);
	const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	const order = detail.order;
	const canUpdateStatus =
		Boolean(updateApiPath) && detail.availableStatusTransitions.length > 0;

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
									disabled={updatingStatusId !== null}
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
