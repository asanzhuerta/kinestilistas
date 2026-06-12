import OrderDeliveryPreparationWorkspace from "@/app/components/orders/OrderDeliveryPreparationWorkspace";
import { requireCommercialSession } from "@/lib/auth/require-session";
import {
	listOrderDeliveriesForCommercialUser,
	listPendingOrderDeliveryPreparationsForCommercialUser,
} from "@/lib/typeorm/services/orders/order-delivery";

export default async function CommercialOrderPreparationPage() {
	const session = await requireCommercialSession();
	const [pendingOrders, openDeliveries] = await Promise.all([
		listPendingOrderDeliveryPreparationsForCommercialUser(session.user.id),
		listOrderDeliveriesForCommercialUser(session.user.id, {
			status: "open",
		}),
	]);

	return (
		<OrderDeliveryPreparationWorkspace
			initialPendingOrders={pendingOrders}
			initialOpenDeliveries={openDeliveries}
		/>
	);
}
