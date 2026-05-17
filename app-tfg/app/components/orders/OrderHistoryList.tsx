import Link from "next/link";
import type { OrderSummary } from "@/lib/contracts/order";
import { formatDateTime } from "@/lib/utils/user-utils";
import { formatOrderCurrency, getOrderStatusClasses } from "./order-ui";

type Props = {
	orders: OrderSummary[];
	mode: "client" | "commercial" | "admin";
	detailBasePath: string;
	emptyMessage: string;
};

export default function OrderHistoryList({
	orders,
	mode,
	detailBasePath,
	emptyMessage,
}: Props) {
	if (orders.length === 0) {
		return (
			<div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-6 text-sm text-slate-600">
				{emptyMessage}
			</div>
		);
	}

	return (
		<div className="mt-5 space-y-4">
			{orders.map((order) => (
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
							</div>
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
									Lineas
								</p>
								<p className="mt-2 text-lg font-semibold text-slate-900">
									{order.line_count}
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
							</div>
						))}
					</div>
				</article>
			))}
		</div>
	);
}
