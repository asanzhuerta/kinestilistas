import { notFound } from "next/navigation";
import OrderDetailView from "@/app/components/orders/OrderDetailView";
import type { OrderDetail } from "@/lib/contracts/order";
import { requireAdminSession } from "@/lib/auth/require-session";
import {
	getOrderDetailForAdmin,
	OrderServiceError,
} from "@/lib/typeorm/services/orders/order";

type PageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function AdminOrderDetailPage({ params }: PageProps) {
	await requireAdminSession();
	const { id } = await params;
	let detail: OrderDetail;

	try {
		detail = await getOrderDetailForAdmin(id);
	} catch (error) {
		if (error instanceof OrderServiceError && error.status === 404) {
			notFound();
		}

		throw error;
	}

	return (
		<OrderDetailView
			title="Detalle de pedido"
			subtitle="Gestiona el estado del pedido y revisa sus referencias registradas."
			initialDetail={detail}
			mode="admin"
			updateApiPath={`/api/admin/orders/${id}`}
			paymentApiPath={`/api/admin/orders/${id}/payments`}
			relatedLinks={[
				{
					label: "Ver ficha del cliente",
					href: `/admin/clients/list/${detail.order.client_id}`,
				},
			]}
		/>
	);
}
