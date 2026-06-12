import { requireClientSession } from "@/lib/auth/require-session";
import OrderWorkspace from "@/app/components/orders/OrderWorkspace";
import {
	getDraftOrderForClientUser,
	listOrderProductOptionsForClientUser,
	listOrdersForClientUser,
} from "@/lib/typeorm/services/orders/order";
import { getOrderBusinessSettings } from "@/lib/typeorm/services/orders/order-settings";

export default async function ClientOrdersPage() {
	const session = await requireClientSession();
	const [productOptions, orders, draftOrder, orderSettings] = await Promise.all([
		listOrderProductOptionsForClientUser(session.user.id),
		listOrdersForClientUser(session.user.id),
		getDraftOrderForClientUser(session.user.id),
		getOrderBusinessSettings(),
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
			agencyDeliveryFee={orderSettings.agencyDeliveryFee}
			initialOrders={orders}
			initialDraftOrder={draftOrder}
			showHistory={false}
			historyHref="/clients/orders/history"
		/>
	);
}
