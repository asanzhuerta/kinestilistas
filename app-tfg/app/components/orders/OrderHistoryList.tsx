"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useSessionStorageState } from "@/app/hooks/useSessionStorageState";
import type { OrderSummary } from "@/lib/contracts/order";
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
	getOrderPaymentStatusClasses,
	getOrderStatusClasses,
	hasOrderLineDiscount,
} from "./order-ui";

type Props = {
	orders: OrderSummary[];
	mode: "client" | "commercial" | "admin";
	detailBasePath: string;
	emptyMessage: string;
};

function normalizeSearchValue(value: unknown) {
	return String(value ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

function buildOrderSearchText(order: OrderSummary) {
	const fields = [
		order.id,
		order.id.slice(0, 8),
		order.client_name,
		order.client_contact_name,
		order.created_by_user_name,
		order.status_code,
		order.status_name,
		order.total_amount,
		order.notes,
		order.payment_status_code,
		order.payment_status_name,
		order.payment_method,
		order.payment_notes,
		order.paid_by_user_name,
		order.created_at,
		order.updated_at,
		order.delivery_visit_scheduled_for_date,
		order.delivery_visit_status_name,
		String(order.line_count),
		...order.lines.flatMap((line) => [
			line.product_name,
			line.product_reference,
			line.order_reference,
			line.color_reference_code,
			line.color_reference_name,
			line.product_line_name,
			String(line.quantity),
			line.unit_price_snapshot,
			line.discount_percentage,
			line.line_total,
			hasOrderLineDiscount(line) ? buildOrderLinePromotionLabel(line) : "",
		]),
	];

	return normalizeSearchValue(fields.filter(Boolean).join(" "));
}

function buildFilterOptions(
	orders: OrderSummary[],
	codeKey: "status_code" | "payment_status_code",
	nameKey: "status_name" | "payment_status_name",
) {
	const options = new Map<string, string>();

	for (const order of orders) {
		const code = String(order[codeKey] ?? "").trim();

		if (!code) {
			continue;
		}

		options.set(code, String(order[nameKey] ?? code));
	}

	return Array.from(options.entries()).sort((left, right) =>
		left[1].localeCompare(right[1], "es"),
	);
}

function buildClientOptions(orders: OrderSummary[]) {
	const options = new Map<string, string>();

	for (const order of orders) {
		if (order.client_id) {
			options.set(order.client_id, order.client_name);
		}
	}

	return Array.from(options.entries()).sort((left, right) =>
		left[1].localeCompare(right[1], "es"),
	);
}

export default function OrderHistoryList({
	orders,
	mode,
	detailBasePath,
	emptyMessage,
}: Props) {
	const filterStorageKey = `order-history:${mode}:${detailBasePath}`;
	const [search, setSearch] = useSessionStorageState(
		`${filterStorageKey}:search`,
		"",
	);
	const [statusFilter, setStatusFilter] = useSessionStorageState(
		`${filterStorageKey}:status`,
		"all",
	);
	const [paymentFilter, setPaymentFilter] = useSessionStorageState(
		`${filterStorageKey}:payment`,
		"all",
	);
	const [clientFilter, setClientFilter] = useSessionStorageState(
		`${filterStorageKey}:client`,
		"all",
	);
	const [isFiltersOpen, setIsFiltersOpen] = useState(false);
	const normalizedSearch = normalizeSearchValue(search);
	const statusOptions = useMemo(
		() => buildFilterOptions(orders, "status_code", "status_name"),
		[orders],
	);
	const paymentOptions = useMemo(
		() =>
			buildFilterOptions(
				orders,
				"payment_status_code",
				"payment_status_name",
			),
		[orders],
	);
	const clientOptions = useMemo(() => buildClientOptions(orders), [orders]);
	const filteredOrders = useMemo(
		() =>
			orders.filter((order) => {
				if (statusFilter !== "all" && order.status_code !== statusFilter) {
					return false;
				}

				if (
					paymentFilter !== "all" &&
					order.payment_status_code !== paymentFilter
				) {
					return false;
				}

				if (clientFilter !== "all" && order.client_id !== clientFilter) {
					return false;
				}

				if (!normalizedSearch) {
					return true;
				}

				return buildOrderSearchText(order).includes(normalizedSearch);
			}),
		[clientFilter, normalizedSearch, orders, paymentFilter, statusFilter],
	);
	const hasActiveFilters =
		search.trim() ||
		statusFilter !== "all" ||
		paymentFilter !== "all" ||
		clientFilter !== "all";

	function resetFilters() {
		setSearch("");
		setStatusFilter("all");
		setPaymentFilter("all");
		setClientFilter("all");
	}

	if (orders.length === 0) {
		return (
			<div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-6 text-sm text-slate-600">
				{emptyMessage}
			</div>
		);
	}

	return (
		<div className="mt-5 space-y-4">
			<section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-sm text-slate-600">
						Mostrando{" "}
						<span className="font-semibold text-slate-900">
							{filteredOrders.length}
						</span>{" "}
						de{" "}
						<span className="font-semibold text-slate-900">
							{orders.length}
						</span>{" "}
						pedidos
					</p>
					<button
						type="button"
						onClick={() => setIsFiltersOpen((currentValue) => !currentValue)}
						className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
					>
						{isFiltersOpen ? "Ocultar filtros" : "Mostrar filtros"}
					</button>
				</div>

				{isFiltersOpen ? (
					<div
						className={`mt-4 grid gap-3 ${
							mode === "client"
								? "lg:grid-cols-[minmax(0,1fr)_220px_220px]"
								: "lg:grid-cols-[minmax(0,1fr)_220px_220px_240px]"
						}`}
					>
						<div>
							<label
								htmlFor="order-history-search"
								className="mb-2 block text-sm font-medium text-slate-700"
							>
								Buscar
							</label>
							<input
								id="order-history-search"
								type="search"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Pedido, cliente, creador, producto, referencia o tono"
								className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							/>
						</div>

						<div>
							<label
								htmlFor="order-history-status"
								className="mb-2 block text-sm font-medium text-slate-700"
							>
								Estado
							</label>
							<select
								id="order-history-status"
								value={statusFilter}
								onChange={(event) => setStatusFilter(event.target.value)}
								className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							>
								<option value="all">Todos</option>
								{statusOptions.map(([code, name]) => (
									<option key={code} value={code}>
										{name}
									</option>
								))}
							</select>
						</div>

						<div>
							<label
								htmlFor="order-history-payment"
								className="mb-2 block text-sm font-medium text-slate-700"
							>
								Cobro
							</label>
							<select
								id="order-history-payment"
								value={paymentFilter}
								onChange={(event) => setPaymentFilter(event.target.value)}
								className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							>
								<option value="all">Todos</option>
								{paymentOptions.map(([code, name]) => (
									<option key={code} value={code}>
										{name}
									</option>
								))}
							</select>
						</div>

						{mode !== "client" ? (
							<div>
								<label
									htmlFor="order-history-client"
									className="mb-2 block text-sm font-medium text-slate-700"
								>
									Cliente
								</label>
								<select
									id="order-history-client"
									value={clientFilter}
									onChange={(event) => setClientFilter(event.target.value)}
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								>
									<option value="all">Todos los clientes</option>
									{clientOptions.map(([id, name]) => (
										<option key={id} value={id}>
											{name}
										</option>
									))}
								</select>
							</div>
						) : null}

						{hasActiveFilters ? (
							<button
								type="button"
								onClick={resetFilters}
								className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 lg:col-start-1"
							>
								Limpiar filtros
							</button>
						) : null}
					</div>
				) : null}
			</section>

			{filteredOrders.length === 0 ? (
				<div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-6 text-sm text-slate-600">
					No hay pedidos que coincidan con la búsqueda o los filtros actuales.
				</div>
			) : null}

			{filteredOrders.map((order) => (
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
								{order.status_code === "delivered" ? (
									<span
										className={`rounded-full px-3 py-1 text-xs font-semibold ${getOrderPaymentStatusClasses(
											order.payment_status_code,
										)}`}
									>
										{order.payment_status_name}
									</span>
								) : null}
								{mode === "client" &&
								order.created_by_user_role_id === ROLE_IDS.COMMERCIAL ? (
									<span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
										Gestionado por {order.created_by_user_name}
									</span>
								) : null}
								{mode !== "client" ? (
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
								<p className="text-sm leading-6 text-slate-600">{order.notes}</p>
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
								{getOrderDiscountSummary(order).hasDiscounts ? (
									<p className="mt-1 text-xs font-semibold text-emerald-700">
										Promo -{" "}
										{formatOrderCents(
											getOrderDiscountSummary(order).totalDiscountCents,
										)}
									</p>
								) : null}
							</div>
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
									Bultos
								</p>
								<p className="mt-2 text-lg font-semibold text-slate-900">
									{getOrderPackageCount(order)}
								</p>
							</div>
							<Link
								href={`${detailBasePath}/${order.id}`}
								className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:col-span-2"
							>
								Ver detalle del pedido
							</Link>
						</div>
					</div>

					<div className="mt-4 grid gap-3 lg:grid-cols-2">
						{order.lines.map((line) => (
							<div
								key={line.id}
								className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
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
								<p className="mt-2 text-sm font-semibold text-slate-900">
									{line.product_name}
								</p>
								{line.color_reference_name ? (
									<p className="mt-1 text-sm text-slate-600">
										{line.color_reference_name}
									</p>
								) : null}
								<p className="mt-1 text-sm text-slate-600">
									Cantidad: {line.quantity}
									{line.product_line_name ? ` - ${line.product_line_name}` : ""}
								</p>
								{hasOrderLineDiscount(line) ? (
									<div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
										<p className="font-semibold">
											{buildOrderLinePromotionLabel(line)}
										</p>
										<p className="mt-1">
											Antes{" "}
											{formatOrderCents(getOrderLineSubtotalCents(line))}
											{" - "}ahorro{" "}
											{formatOrderCents(getOrderLineDiscountCents(line))}
											{" - "}final {formatOrderCurrency(line.line_total)}
										</p>
									</div>
								) : null}
							</div>
						))}
					</div>
				</article>
			))}
		</div>
	);
}
