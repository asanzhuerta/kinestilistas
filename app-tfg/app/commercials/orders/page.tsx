import { requireCommercialSession } from "@/lib/auth/require-session";
import OrderWorkspace from "@/app/components/orders/OrderWorkspace";
import { listClientsByCommercialId } from "@/lib/typeorm/services/commercial/client";
import { requireCommercialByUserId } from "@/lib/typeorm/services/commercial/commercial";
import {
	getDraftOrderForCommercialUser,
	listOrderProductOptions,
	listOrdersForCommercialUser,
} from "@/lib/typeorm/services/orders/order";

export default async function CommercialOrdersPage() {
	const session = await requireCommercialSession();
	const commercial = await requireCommercialByUserId(session.user.id);
	const clients = await listClientsByCommercialId(commercial.id);
	const initialSelectedClientId = clients[0]?.id ?? null;
	const [productOptions, orders, initialDraftOrder] = await Promise.all([
		listOrderProductOptions(),
		listOrdersForCommercialUser(session.user.id),
		getDraftOrderForCommercialUser(session.user.id, {
			clientId: initialSelectedClientId,
		}),
	]);

	return (
		<OrderWorkspace
			mode="commercial"
			title="Pedidos"
			subtitle="Supervisa todos los pedidos de tus clientes y registra nuevos solo cuando lo necesites"
			backHref="/commercials"
			apiPath="/api/commercial/orders"
			detailBasePath="/commercials/orders"
			productOptions={productOptions}
			initialOrders={orders}
			initialDraftOrder={initialDraftOrder}
			initialSelectedClientId={initialSelectedClientId}
			clientOptions={clients.map((client) => ({
				id: client.id,
				name: client.name,
				contactName: client.contact_name ?? null,
			}))}
		/>
	);
}
