import { requireClientSession } from "@/lib/auth/require-session";
import OrderWorkspace from "@/app/components/orders/OrderWorkspace";
import { listOrdersForClientUser } from "@/lib/typeorm/services/orders/order";

export default async function ClientOrdersHistoryPage() {
	const session = await requireClientSession();
	const orders = await listOrdersForClientUser(session.user.id);

	return (
		<OrderWorkspace
			mode="client"
			title="Historial de pedidos"
			subtitle="Consulta los pedidos registrados y abre su detalle."
			backHref="/clients/orders"
			apiPath="/api/clients/orders"
			detailBasePath="/clients/orders"
			productOptions={[]}
			initialOrders={orders}
			initialDraftOrder={null}
			showOrderForm={false}
		/>
	);
}
