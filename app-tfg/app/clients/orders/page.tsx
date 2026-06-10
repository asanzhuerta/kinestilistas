import { requireClientSession } from "@/lib/auth/require-session";
import OrderWorkspace from "@/app/components/orders/OrderWorkspace";
import {
	getDraftOrderForClientUser,
	listOrderProductOptions,
	listOrdersForClientUser,
} from "@/lib/typeorm/services/orders/order";

export default async function ClientOrdersPage() {
	const session = await requireClientSession();
	const [productOptions, orders, draftOrder] = await Promise.all([
		listOrderProductOptions(),
		listOrdersForClientUser(session.user.id),
		getDraftOrderForClientUser(session.user.id),
	]);

	return (
		<OrderWorkspace
			mode="client"
			title="Pedidos"
			subtitle=""
			backHref="/clients"
			apiPath="/api/clients/orders"
			detailBasePath="/clients/orders"
			productOptions={productOptions}
			initialOrders={orders}
			initialDraftOrder={draftOrder}
			showHistory={false}
			historyHref="/clients/orders/history"
		/>
	);
}
