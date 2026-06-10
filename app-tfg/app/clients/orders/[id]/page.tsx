import { notFound } from "next/navigation";
import OrderDetailView from "@/app/components/orders/OrderDetailView";
import type { OrderDetail } from "@/lib/contracts/order";
import { requireClientSession } from "@/lib/auth/require-session";
import {
	getOrderDetailForClientUser,
	OrderServiceError,
} from "@/lib/typeorm/services/orders/order";

type PageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function ClientOrderDetailPage({ params }: PageProps) {
	const [session, { id }] = await Promise.all([requireClientSession(), params]);
	let detail: OrderDetail;

	try {
		detail = await getOrderDetailForClientUser(session.user.id, id);
	} catch (error) {
		if (error instanceof OrderServiceError && error.status === 404) {
			notFound();
		}

		throw error;
	}

	return (
		<OrderDetailView
			title="Detalle de pedido"
			subtitle="Consulta las referencias y el estado actual de tu pedido."
			backHref="/clients/orders/history"
			backLabel="Volver al historial"
			initialDetail={detail}
			mode="client"
		/>
	);
}
