import { requireClientSession } from "@/lib/auth/require-session";
import OrderWorkspace from "@/app/components/orders/OrderWorkspace";
import {
	listOrderProductOptions,
	listOrdersForClientUser,
} from "@/lib/typeorm/services/orders/order";

export default async function ClientOrdersPage() {
	const session = await requireClientSession();
	const [productOptions, orders] = await Promise.all([
		listOrderProductOptions(),
		listOrdersForClientUser(session.user.id),
	]);

	return (
		<OrderWorkspace
			mode="client"
			title="Pedidos"
			subtitle="Crea pedidos y consulta su historial"
			backHref="/clients"
			apiPath="/api/clients/orders"
			productOptions={productOptions}
			initialOrders={orders}
		/>
	);
}
