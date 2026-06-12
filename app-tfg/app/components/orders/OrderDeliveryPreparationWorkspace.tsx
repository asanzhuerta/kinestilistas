"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import PageTransition from "@/app/components/animations/PageTransition";
import H1Title from "@/app/components/H1Title";
import SubmitButton from "@/app/components/forms/SubmitButton";
import { requestJson } from "@/lib/api/client";
import type {
	OrderDeliverySummary,
	PendingOrderDeliveryPreparation,
} from "@/lib/contracts/order";

type Props = {
	initialPendingOrders: PendingOrderDeliveryPreparation[];
	initialOpenDeliveries: OrderDeliverySummary[];
};

type QuantityByLineId = Record<string, string>;

function buildInitialQuantities(order: PendingOrderDeliveryPreparation | null) {
	return Object.fromEntries(
		(order?.lines ?? [])
			.filter((line) => line.remaining_quantity > 0)
			.map((line) => [line.id, "0"]),
	) as QuantityByLineId;
}

export default function OrderDeliveryPreparationWorkspace({
	initialPendingOrders,
	initialOpenDeliveries,
}: Props) {
	const [pendingOrders, setPendingOrders] = useState(initialPendingOrders);
	const [openDeliveries, setOpenDeliveries] = useState(initialOpenDeliveries);
	const [selectedOrderId, setSelectedOrderId] = useState(
		initialPendingOrders[0]?.id ?? "",
	);
	const selectedOrder = useMemo(
		() => pendingOrders.find((order) => order.id === selectedOrderId) ?? null,
		[pendingOrders, selectedOrderId],
	);
	const [quantities, setQuantities] = useState<QuantityByLineId>(
		buildInitialQuantities(selectedOrder),
	);
	const [packageCount, setPackageCount] = useState("1");
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	function selectOrder(orderId: string) {
		const nextOrder = pendingOrders.find((order) => order.id === orderId) ?? null;
		setSelectedOrderId(orderId);
		setQuantities(buildInitialQuantities(nextOrder));
		setPackageCount("1");
		setNotes("");
		setFeedback(null);
	}

	async function reloadData() {
		const [nextPendingOrders, nextOpenDeliveries] = await Promise.all([
			requestJson<PendingOrderDeliveryPreparation[]>(
				"/api/commercial/order-deliveries?mode=preparation",
				{
					method: "GET",
					cache: "no-store",
					fallbackMessage: "No se pudieron recargar los pedidos pendientes",
				},
			),
			requestJson<OrderDeliverySummary[]>(
				"/api/commercial/order-deliveries?status=open",
				{
					method: "GET",
					cache: "no-store",
					fallbackMessage: "No se pudieron recargar los repartos abiertos",
				},
			),
		]);

		setPendingOrders(Array.isArray(nextPendingOrders) ? nextPendingOrders : []);
		setOpenDeliveries(Array.isArray(nextOpenDeliveries) ? nextOpenDeliveries : []);

		const stillAvailable = nextPendingOrders.find(
			(order) => order.id === selectedOrderId,
		);
		const nextSelectedOrder = stillAvailable ?? nextPendingOrders[0] ?? null;
		setSelectedOrderId(nextSelectedOrder?.id ?? "");
		setQuantities(buildInitialQuantities(nextSelectedOrder));
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		if (!selectedOrder) {
			setFeedback({
				type: "error",
				message: "Selecciona un pedido con referencias pendientes.",
			});
			return;
		}

		const lines = selectedOrder.lines
			.map((line) => ({
				orderLineId: line.id,
				quantity: Number(quantities[line.id] ?? 0),
			}))
			.filter((line) => Number.isInteger(line.quantity) && line.quantity > 0);

		if (lines.length === 0) {
			setFeedback({
				type: "error",
				message: "Indica al menos una cantidad para preparar el reparto.",
			});
			return;
		}

		try {
			setSaving(true);
			setFeedback(null);
			const delivery = await requestJson<OrderDeliverySummary>(
				"/api/commercial/order-deliveries",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						orderId: selectedOrder.id,
						packageCount,
						notes,
						lines,
					}),
					fallbackMessage: "No se pudo preparar el reparto",
				},
			);

			setFeedback({
				type: "success",
				message: `Reparto ${delivery.id.slice(0, 8)} preparado correctamente.`,
			});
			await reloadData();
		} catch (error) {
			setFeedback({
				type: "error",
				message:
					error instanceof Error
						? error.message
						: "No se pudo preparar el reparto.",
			});
		} finally {
			setSaving(false);
		}
	}

	function getFulfillmentLabel(
		method: PendingOrderDeliveryPreparation["fulfillment_method"],
	) {
		return method === "agency" ? "Agencia" : "Comercial";
	}

	function getFulfillmentClasses(
		method: PendingOrderDeliveryPreparation["fulfillment_method"],
	) {
		return method === "agency"
			? "bg-amber-100 text-amber-800"
			: "bg-sky-100 text-sky-800";
	}

	return (
		<PageTransition>
			<div className="space-y-6">
				<H1Title
					title="Preparar repartos"
					subtitle="Divide pedidos confirmados en repartos reales antes de planificar la visita."
				/>

				<div className="flex flex-wrap items-center gap-3">
					<Link
						href="/commercials/orders"
						className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
					>
						Ver pedidos
					</Link>
					<Link
						href="/commercials/visits"
						className="rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
					>
						Planificar visitas
					</Link>
				</div>

				{feedback ? (
					<div
						className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
							feedback.type === "success"
								? "border-emerald-200 bg-emerald-50 text-emerald-700"
								: "border-rose-200 bg-rose-50 text-rose-700"
						}`}
					>
						{feedback.message}
					</div>
				) : null}

				<div className="grid gap-6 xl:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
					<section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
						<div className="flex items-center justify-between gap-3">
							<h2 className="text-lg font-semibold text-slate-900">
								Pedidos pendientes
							</h2>
							<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
								{pendingOrders.length}
							</span>
						</div>

						<div className="mt-4 space-y-3">
							{pendingOrders.length === 0 ? (
								<p className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
									No hay pedidos confirmados con referencias pendientes de
									preparar.
								</p>
							) : (
								pendingOrders.map((order) => (
									<button
										key={order.id}
										type="button"
										onClick={() => selectOrder(order.id)}
										className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
											order.id === selectedOrderId
												? "border-sky-300 bg-sky-50"
												: "border-slate-200 bg-white hover:border-slate-300"
										}`}
									>
										<p className="text-sm font-semibold text-slate-900">
											{order.client_name}
										</p>
										<p className="mt-1 text-xs text-slate-500">
											Pedido {order.id.slice(0, 8)} ·{" "}
											{order.remaining_line_count} ud. pendientes
										</p>
										<span
											className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getFulfillmentClasses(
												order.fulfillment_method,
											)}`}
										>
											{getFulfillmentLabel(order.fulfillment_method)}
										</span>
									</button>
								))
							)}
						</div>
					</section>

					<section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
						<h2 className="text-lg font-semibold text-slate-900">
							Nuevo reparto
						</h2>

						{selectedOrder ? (
							<form onSubmit={handleSubmit} className="mt-5 space-y-5">
								<div className="grid gap-3 md:grid-cols-3">
									<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
										<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
											Pedido seleccionado
										</p>
										<p className="mt-1 text-sm font-semibold text-slate-900">
											{selectedOrder.client_name} · {selectedOrder.id.slice(0, 8)}
										</p>
										<span
											className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getFulfillmentClasses(
												selectedOrder.fulfillment_method,
											)}`}
										>
											{getFulfillmentLabel(selectedOrder.fulfillment_method)}
										</span>
									</div>

									<div>
										<label
											htmlFor="delivery-package-count"
											className="mb-2 block text-sm font-semibold text-slate-700"
										>
											Bultos
										</label>
										<input
											id="delivery-package-count"
											type="number"
											min="1"
											step="1"
											value={packageCount}
											onChange={(event) => setPackageCount(event.target.value)}
											className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
											required
										/>
									</div>
								</div>

								<div className="space-y-3">
									{selectedOrder.lines
										.filter((line) => line.remaining_quantity > 0)
										.map((line) => (
											<div
												key={line.id}
												className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_140px]"
											>
												<div>
													<p className="text-sm font-semibold text-slate-900">
														{line.order_reference} · {line.product_name}
													</p>
													<p className="mt-1 text-xs text-slate-500">
														Pendiente: {line.remaining_quantity} de {line.quantity}
														{line.color_reference_name
															? ` · ${line.color_reference_name}`
															: ""}
													</p>
												</div>
												<div>
													<label
														htmlFor={`delivery-line-${line.id}`}
														className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500"
													>
														Unidades
													</label>
													<input
														id={`delivery-line-${line.id}`}
														type="number"
														min="0"
														max={line.remaining_quantity}
														step="1"
														value={quantities[line.id] ?? "0"}
														onChange={(event) =>
															setQuantities((current) => ({
																...current,
																[line.id]: event.target.value,
															}))
														}
														className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
													/>
												</div>
											</div>
										))}
								</div>

								<div>
									<label
										htmlFor="delivery-notes"
										className="mb-2 block text-sm font-semibold text-slate-700"
									>
										Notas
									</label>
									<textarea
										id="delivery-notes"
										value={notes}
										onChange={(event) => setNotes(event.target.value)}
										rows={3}
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
										placeholder="Productos pendientes, incidencia de stock o indicaciones de preparacion"
									/>
								</div>

								<SubmitButton
									isSubmitting={saving}
									submittingText="Preparando..."
									className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
								>
									Preparar reparto
								</SubmitButton>
							</form>
						) : (
							<p className="mt-5 rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500">
								Selecciona un pedido pendiente para preparar su reparto.
							</p>
						)}
					</section>
				</div>

				<section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
					<div className="flex items-center justify-between gap-3">
						<h2 className="text-lg font-semibold text-slate-900">
							Repartos abiertos
						</h2>
						<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
							{openDeliveries.length}
						</span>
					</div>

					<div className="mt-4 grid gap-3 lg:grid-cols-2">
						{openDeliveries.length === 0 ? (
							<p className="rounded-2xl border border-dashed border-slate-200 px-4 py-5 text-sm text-slate-500 lg:col-span-2">
								No hay repartos preparados o planificados pendientes de entrega.
							</p>
						) : (
							openDeliveries.map((delivery) => (
								<article
									key={delivery.id}
									className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
								>
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<p className="text-sm font-semibold text-slate-900">
												{delivery.client_name}
											</p>
											<p className="mt-1 text-xs text-slate-500">
												Reparto {delivery.id.slice(0, 8)} · Pedido{" "}
												{delivery.order_short_id}
											</p>
										</div>
										<span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
											{delivery.status_name}
										</span>
										<span
											className={`rounded-full px-3 py-1 text-xs font-semibold ${
												delivery.fulfillment_method === "agency"
													? "bg-amber-100 text-amber-800"
													: "bg-sky-100 text-sky-800"
											}`}
										>
											{delivery.fulfillment_method === "agency"
												? "Agencia"
												: "Comercial"}
										</span>
									</div>
									<p className="mt-3 text-sm text-slate-600">
										{delivery.package_count} bulto
										{delivery.package_count === 1 ? "" : "s"} ·{" "}
										{delivery.line_count} referencia
										{delivery.line_count === 1 ? "" : "s"}
									</p>
									<div className="mt-4 flex flex-wrap gap-2">
										<Link
											href={`/api/commercial/order-deliveries/${delivery.id}/qr-pdf`}
											className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
										>
											{delivery.fulfillment_method === "agency"
												? "Descargar etiqueta agencia"
												: "Descargar etiqueta QR"}
										</Link>
										<Link
											href={`/commercials/orders/${delivery.order_id}`}
											className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
										>
											Ver pedido
										</Link>
									</div>
								</article>
							))
						)}
					</div>
				</section>
			</div>
		</PageTransition>
	);
}
