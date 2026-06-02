import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";
import OrderHistoryList from "@/app/components/orders/OrderHistoryList";
import { requireCommercialSession } from "@/lib/auth/require-session";
import { ORDER_STATUS_IDS } from "@/lib/typeorm/constants/catalog-ids";
import { listOrdersForCommercialUser } from "@/lib/typeorm/services/orders/order";

export default async function CommercialPaymentsPage() {
	const session = await requireCommercialSession();
	const orders = await listOrdersForCommercialUser(session.user.id, {
		statusId: ORDER_STATUS_IDS.DELIVERED,
	});
	const sortedOrders = [...orders].sort((left, right) => {
		if (left.payment_status_id !== right.payment_status_id) {
			return left.payment_status_id - right.payment_status_id;
		}

		return right.created_at.localeCompare(left.created_at);
	});
	const pendingCount = orders.filter(
		(order) => order.payment_status_code === "pending",
	).length;
	const paidCount = orders.filter(
		(order) => order.payment_status_code === "paid",
	).length;

	return (
		<PageTransition>
			<div className="space-y-6">
				<H1Title
					title="Cobros"
					subtitle="Supervisa los pedidos entregados y registra su cobro final."
				/>

				<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div className="flex flex-col gap-2">
						<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
							M4
						</p>
						<h2 className="text-2xl font-semibold text-slate-900">
							Seguimiento comercial de cobros
						</h2>
						<p className="text-sm text-slate-600">
							Aqui solo aparecen pedidos que ya constan como entregados, para
							que el ciclo de pedido, reparto y cobro quede completo.
						</p>
					</div>

					<div className="mt-5 grid gap-3 sm:grid-cols-2">
						<div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
								Pendientes de cobro
							</p>
							<p className="mt-2 text-2xl font-semibold text-amber-900">
								{pendingCount}
							</p>
						</div>
						<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
							<p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
								Cobrados
							</p>
							<p className="mt-2 text-2xl font-semibold text-emerald-900">
								{paidCount}
							</p>
						</div>
					</div>

					<OrderHistoryList
						orders={sortedOrders}
						mode="commercial"
						detailBasePath="/commercials/orders"
						emptyMessage="Todavia no hay pedidos entregados pendientes de seguimiento de cobro."
					/>
				</section>
			</div>
		</PageTransition>
	);
}
