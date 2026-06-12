import { requireCommercialSession } from "@/lib/auth/require-session";
import OrderWorkspace from "@/app/components/orders/OrderWorkspace";
import { listClientsByCommercialId } from "@/lib/typeorm/services/commercial/client";
import { requireCommercialByUserId } from "@/lib/typeorm/services/commercial/commercial";
import {
	getDraftOrderForCommercialUser,
	listOrderProductOptionsForCommercialUser,
	listOrdersForCommercialUser,
} from "@/lib/typeorm/services/orders/order";
import { getOrderBusinessSettings } from "@/lib/typeorm/services/orders/order-settings";

type CommercialOrdersPageProps = {
	searchParams?: Promise<{
		clientId?: string;
	}>;
};

export default async function CommercialOrdersPage({
	searchParams,
}: CommercialOrdersPageProps) {
	const session = await requireCommercialSession();
	const commercial = await requireCommercialByUserId(session.user.id);
	const clients = await listClientsByCommercialId(commercial.id);
	const resolvedSearchParams = await searchParams;
	const requestedClientId = String(resolvedSearchParams?.clientId ?? "").trim();
	const requestedClient = clients.find(
		(client) => client.id === requestedClientId,
	);
	const initialSelectedClientId =
		requestedClient?.id ?? clients[0]?.id ?? null;
	const [productOptions, orders, initialDraftOrder, orderSettings] = await Promise.all([
		listOrderProductOptionsForCommercialUser(session.user.id, {
			clientId: initialSelectedClientId,
		}),
		listOrdersForCommercialUser(session.user.id),
		getDraftOrderForCommercialUser(session.user.id, {
			clientId: initialSelectedClientId,
		}),
		getOrderBusinessSettings(),
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
			agencyDeliveryFee={orderSettings.agencyDeliveryFee}
			initialOrders={orders}
			initialDraftOrder={initialDraftOrder}
			initialSelectedClientId={initialSelectedClientId}
			initialCreatePanelOpen={Boolean(requestedClient)}
			clientOptions={clients.map((client) => ({
				id: client.id,
				name: client.name,
				contactName: client.contact_name ?? null,
			}))}
		/>
	);
}
