"use client";

import Link from "next/link";
import { useState } from "react";
import PageTransition from "@/app/components/animations/PageTransition";
import H1Title from "@/app/components/H1Title";
import type {
	OrderProductOption,
	OrderSummary,
} from "@/lib/contracts/order";
import { formatDateTime } from "@/lib/utils/user-utils";

type OrderClientOption = {
	id: string;
	name: string;
	contactName: string | null;
};

type EditableLine = {
	localId: string;
	productId: string;
	quantity: number;
};

type WorkspaceProps = {
	mode: "client" | "commercial";
	title: string;
	subtitle: string;
	backHref: string;
	apiPath: string;
	productOptions: OrderProductOption[];
	initialOrders: OrderSummary[];
	clientOptions?: OrderClientOption[];
};

function formatCurrency(amount: string) {
	const parsed = Number(amount);

	if (!Number.isFinite(parsed)) {
		return amount;
	}

	return parsed.toLocaleString("es-ES", {
		style: "currency",
		currency: "EUR",
	});
}

function getOrderStatusClasses(statusCode: string) {
	switch (statusCode) {
		case "created":
			return "bg-amber-100 text-amber-700";
		case "confirmed":
			return "bg-sky-100 text-sky-700";
		case "delivered":
			return "bg-emerald-100 text-emerald-700";
		case "cancelled":
			return "bg-rose-100 text-rose-700";
		default:
			return "bg-slate-100 text-slate-700";
	}
}

function buildProductLabel(product: OrderProductOption) {
	const contextParts = [
		product.productCategoryName,
		product.productLineName,
	].filter(Boolean);

	return `${product.reference} · ${product.name}${
		contextParts.length > 0 ? ` · ${contextParts.join(" / ")}` : ""
	}`;
}

export default function OrderWorkspace({
	mode,
	title,
	subtitle,
	backHref,
	apiPath,
	productOptions,
	initialOrders,
	clientOptions = [],
}: WorkspaceProps) {
	const [orders, setOrders] = useState(initialOrders);
	const [lines, setLines] = useState<EditableLine[]>([
		{
			localId: "line-1",
			productId: "",
			quantity: 1,
		},
	]);
	const [selectedClientId, setSelectedClientId] = useState(
		clientOptions[0]?.id ?? "",
	);
	const [notes, setNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);
	const [productSearch, setProductSearch] = useState("");
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	const visibleOrders =
		mode === "commercial" && selectedClientId
			? orders.filter((order) => order.client_id === selectedClientId)
			: orders;

	const filteredProductOptions = productOptions.filter((product) =>
		buildProductLabel(product)
			.toLowerCase()
			.includes(productSearch.trim().toLowerCase()),
	);

	function updateLine(localId: string, updates: Partial<EditableLine>) {
		setLines((currentLines) =>
			currentLines.map((line) =>
				line.localId === localId ? { ...line, ...updates } : line,
			),
		);
	}

	function addLine() {
		setLines((currentLines) => [
			...currentLines,
			{
				localId: `line-${Date.now()}-${currentLines.length + 1}`,
				productId: "",
				quantity: 1,
			},
		]);
	}

	function removeLine(localId: string) {
		setLines((currentLines) =>
			currentLines.length === 1
				? currentLines
				: currentLines.filter((line) => line.localId !== localId),
		);
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setFeedback(null);

		if (mode === "commercial" && !selectedClientId) {
			setFeedback({
				type: "error",
				message: "Selecciona primero un cliente asignado para registrar el pedido.",
			});
			return;
		}

		const payloadLines = lines.map((line) => ({
			productId: line.productId,
			quantity: line.quantity,
		}));

		setSubmitting(true);

		try {
			const response = await fetch(apiPath, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					clientId: mode === "commercial" ? selectedClientId : undefined,
					notes,
					lines: payloadLines,
				}),
			});

			const data = (await response.json().catch(() => null)) as
				| OrderSummary
				| { error?: string }
				| null;

			if (!response.ok || !data || !("id" in data)) {
				setFeedback({
					type: "error",
					message:
						(data && "error" in data && data.error) ||
						"No se ha podido registrar el pedido.",
				});
				return;
			}

			setOrders((currentOrders) => [data, ...currentOrders]);
			setNotes("");
			setLines([
				{
					localId: "line-1",
					productId: "",
					quantity: 1,
				},
			]);
			setFeedback({
				type: "success",
				message: `Pedido registrado correctamente por un total de ${formatCurrency(
					data.total_amount,
				)}.`,
			});
		} catch (error) {
			console.error("[orders][submit] error:", error);
			setFeedback({
				type: "error",
				message: "Ha ocurrido un error inesperado al registrar el pedido.",
			});
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<PageTransition>
			<div className="space-y-6">
				<H1Title title={title} subtitle={subtitle} />

				<div className="flex flex-wrap items-center justify-between gap-3">
					<Link
						href={backHref}
						className="inline-flex rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white"
					>
						Volver
					</Link>

					<p className="max-w-2xl text-sm text-slate-600">
						{mode === "client"
							? "Selecciona productos y cantidades. El sistema calculara el total del pedido sin exponer precios unitarios."
							: "Puedes registrar pedidos para clientes actualmente asignados. El historial queda visible por cliente con estado e importe total."}
					</p>
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

				<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
					<div className="flex flex-col gap-2">
						<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
							Nuevo pedido
						</p>
						<h2 className="text-2xl font-semibold text-slate-900">
							Registrar composicion del pedido
						</h2>
					</div>

					{mode === "commercial" && clientOptions.length === 0 ? (
						<div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-6 text-sm text-slate-600">
							No tienes clientes asignados ahora mismo, asi que todavia no
							puedes registrar pedidos desde el area comercial.
						</div>
					) : (
						<form onSubmit={handleSubmit} className="mt-5 space-y-5">
							{mode === "commercial" ? (
								<div>
									<label
										htmlFor="order-client"
										className="mb-2 block text-sm font-medium text-slate-700"
									>
										Cliente
									</label>
									<select
										id="order-client"
										value={selectedClientId}
										onChange={(event) => setSelectedClientId(event.target.value)}
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									>
										{clientOptions.map((client) => (
											<option key={client.id} value={client.id}>
												{client.name}
												{client.contactName ? ` · ${client.contactName}` : ""}
											</option>
										))}
									</select>
								</div>
							) : null}

							<div>
								<label
									htmlFor="order-product-search"
									className="mb-2 block text-sm font-medium text-slate-700"
								>
									Buscar productos
								</label>
								<input
									id="order-product-search"
									type="text"
									value={productSearch}
									onChange={(event) => setProductSearch(event.target.value)}
									placeholder="Referencia, nombre, categoria o linea"
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>
							</div>

							<div className="space-y-3">
								{lines.map((line, index) => (
									<div
										key={line.localId}
										className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[minmax(0,1fr)_120px_auto]"
									>
										<div>
											<label
												htmlFor={`order-product-${line.localId}`}
												className="mb-2 block text-sm font-medium text-slate-700"
											>
												Producto {index + 1}
											</label>
											<select
												id={`order-product-${line.localId}`}
												value={line.productId}
												onChange={(event) =>
													updateLine(line.localId, {
														productId: event.target.value,
													})
												}
												className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
											>
												<option value="">Selecciona una referencia</option>
												{filteredProductOptions.map((product) => (
													<option key={product.id} value={product.id}>
														{buildProductLabel(product)}
													</option>
												))}
											</select>
										</div>

										<div>
											<label
												htmlFor={`order-quantity-${line.localId}`}
												className="mb-2 block text-sm font-medium text-slate-700"
											>
												Cantidad
											</label>
											<input
												id={`order-quantity-${line.localId}`}
												type="number"
												min={1}
												step={1}
												value={line.quantity}
												onChange={(event) =>
													updateLine(line.localId, {
														quantity: Number(event.target.value),
													})
												}
												className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
											/>
										</div>

										<div className="flex items-end">
											<button
												type="button"
												onClick={() => removeLine(line.localId)}
												disabled={lines.length === 1}
												className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
											>
												Quitar
											</button>
										</div>
									</div>
								))}
							</div>

							<div className="flex flex-wrap gap-3">
								<button
									type="button"
									onClick={addLine}
									className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
								>
									Añadir linea
								</button>
							</div>

							<div>
								<label
									htmlFor="order-notes"
									className="mb-2 block text-sm font-medium text-slate-700"
								>
									Observaciones
								</label>
								<textarea
									id="order-notes"
									value={notes}
									onChange={(event) => setNotes(event.target.value)}
									rows={4}
									placeholder="Indicaciones de preparacion, reparto o contexto comercial"
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>
							</div>

							<button
								type="submit"
								disabled={submitting}
								className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
							>
								{submitting ? "Registrando pedido..." : "Registrar pedido"}
							</button>
						</form>
					)}
				</section>

				<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
					<div className="flex flex-col gap-2">
						<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
							Historial
						</p>
						<h2 className="text-2xl font-semibold text-slate-900">
							Pedidos registrados
						</h2>
					</div>

					{visibleOrders.length === 0 ? (
						<div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-6 text-sm text-slate-600">
							Aun no hay pedidos registrados en este contexto.
						</div>
					) : (
						<div className="mt-5 space-y-4">
							{visibleOrders.map((order) => (
								<article
									key={order.id}
									className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
								>
									<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
										<div className="space-y-2">
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
												{mode === "commercial" ? (
													<span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold text-fuchsia-700">
														{order.client_name}
													</span>
												) : null}
											</div>

											<p className="text-sm text-slate-600">
												Registrado el{" "}
												<span className="font-medium text-slate-900">
													{formatDateTime(order.created_at)}
												</span>{" "}
												por{" "}
												<span className="font-medium text-slate-900">
													{order.created_by_user_name}
												</span>
											</p>

											{order.notes ? (
												<p className="text-sm leading-6 text-slate-600">
													{order.notes}
												</p>
											) : null}
										</div>

										<div className="grid gap-3 sm:grid-cols-2 lg:w-[320px]">
											<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
												<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
													Importe total
												</p>
												<p className="mt-2 text-lg font-semibold text-slate-900">
													{formatCurrency(order.total_amount)}
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
										</div>
									</div>

									<div className="mt-4 grid gap-3 lg:grid-cols-2">
										{order.lines.map((line) => (
											<div
												key={line.id}
												className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
											>
												<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
													{line.product_reference}
												</p>
												<p className="mt-1 text-sm font-semibold text-slate-900">
													{line.product_name}
												</p>
												<p className="mt-1 text-sm text-slate-600">
													Cantidad: {line.quantity}
													{line.product_line_name
														? ` · ${line.product_line_name}`
														: ""}
												</p>
											</div>
										))}
									</div>
								</article>
							))}
						</div>
					)}
				</section>
			</div>
		</PageTransition>
	);
}
