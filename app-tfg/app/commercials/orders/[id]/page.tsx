import { notFound } from "next/navigation";
import OrderDetailView from "@/app/components/orders/OrderDetailView";
import type { OrderDetail } from "@/lib/contracts/order";
import { requireCommercialSession } from "@/lib/auth/require-session";
import {
	getOrderDetailForCommercialUser,
	OrderServiceError,
} from "@/lib/typeorm/services/orders/order";

type PageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function CommercialOrderDetailPage({
	params,
}: PageProps) {
	const [session, { id }] = await Promise.all([
		requireCommercialSession(),
		params,
	]);
	let detail: OrderDetail;

	try {
		detail = await getOrderDetailForCommercialUser(session.user.id, id);
	} catch (error) {
		if (error instanceof OrderServiceError && error.status === 404) {
			notFound();
		}

		throw error;
	}

	return (
		<OrderDetailView
			title="Detalle de pedido"
			subtitle="Revisa el pedido del cliente y avanza su estado cuando corresponda."
			initialDetail={detail}
			mode="commercial"
			updateApiPath={`/api/commercial/orders/${id}`}
			paymentApiPath={`/api/commercial/orders/${id}/payments`}
			qrPdfHref={`/api/commercial/orders/${id}/qr-pdf`}
			relatedLinks={[
				{
					label: "Ver ficha del cliente",
					href: `/commercials/clients/${detail.order.client_id}`,
				},
				...(detail.order.delivery_visit_id
					? [
							{
								label: "Ver visita de reparto",
								href: `/commercials/visits/${detail.order.delivery_visit_id}`,
							},
						]
					: []),
				...detail.order.deliveries
					.filter((delivery) => Boolean(delivery.delivery_visit_id))
					.slice(0, 1)
					.map((delivery) => ({
						label: "Ver visita del reparto",
						href: `/commercials/visits/${delivery.delivery_visit_id}`,
					})),
				{
					label: "Preparar repartos",
					href: "/commercials/orders/preparation",
				},
				{
					label: "Ver agenda comercial",
					href: "/commercials/visits",
				},
			]}
		/>
	);
}
