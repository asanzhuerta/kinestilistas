import { requireCommercialSession } from "@/lib/auth/require-session";
import OrderWorkspace from "@/app/components/orders/OrderWorkspace";
import { listClientsByCommercialId } from "@/lib/typeorm/services/commercial/client";
import { requireCommercialByUserId } from "@/lib/typeorm/services/commercial/commercial";
import {
	listOrderProductOptions,
	listOrdersForCommercialUser,
} from "@/lib/typeorm/services/orders/order";

export default async function CommercialOrdersPage() {
	const session = await requireCommercialSession();
	const commercial = await requireCommercialByUserId(session.user.id);

	const [productOptions, orders, clients] = await Promise.all([
		listOrderProductOptions(),
		listOrdersForCommercialUser(session.user.id),
		listClientsByCommercialId(commercial.id),
	]);

	return (
		<OrderWorkspace
			mode="commercial"
			title="Pedidos"
			subtitle="Registra pedidos para clientes asignados"
			backHref="/commercials"
			apiPath="/api/commercial/orders"
			productOptions={productOptions}
			initialOrders={orders}
			clientOptions={clients.map((client) => ({
				id: client.id,
				name: client.name,
				contactName: client.contact_name ?? null,
			}))}
		/>
	);
}
