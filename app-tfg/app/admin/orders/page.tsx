import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";
import OrderHistoryList from "@/app/components/orders/OrderHistoryList";
import { requireAdminSession } from "@/lib/auth/require-session";
import { listOrdersForAdmin } from "@/lib/typeorm/services/orders/order";

export default async function AdminOrdersPage() {
	await requireAdminSession();
	const orders = await listOrdersForAdmin();

	return (
		<PageTransition>
			<div className="space-y-6">
				<H1Title
					title="Pedidos"
					subtitle="Supervisa el estado de los pedidos registrados y entra en su detalle."
				/>

				<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
					<div className="flex flex-col gap-2">
						<h2 className="text-2xl font-semibold text-slate-900">
							Historial global de pedidos
						</h2>
						<p className="text-sm text-slate-600">
							Desde aqui puedes revisar pedidos de cualquier cliente y avanzar
							su ciclo de vida operativo.
						</p>
					</div>

					<OrderHistoryList
						orders={orders}
						mode="admin"
						detailBasePath="/admin/orders"
						emptyMessage="Aun no hay pedidos registrados en el sistema."
					/>
				</section>
			</div>
		</PageTransition>
	);
}
