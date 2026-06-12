import type { RouteContext } from "@/lib/contracts/api";
import {
	jsonFromError,
	logApiError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import { buildOrderDeliveryQrPdf } from "@/lib/orders/qr-pdf";
import { getOrderDeliveryForCommercialUser } from "@/lib/typeorm/services/orders/order-delivery";

export const runtime = "nodejs";

export async function GET(_: Request, context: RouteContext) {
	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const delivery = await getOrderDeliveryForCommercialUser(user.id, id);
		const pdf = await buildOrderDeliveryQrPdf(delivery);
		const fileName =
			delivery.fulfillment_method === "agency"
				? `etiqueta-agencia-${delivery.id.slice(0, 8)}.pdf`
				: `qr-reparto-${delivery.id.slice(0, 8)}.pdf`;

		return new Response(pdf, {
			status: 200,
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename="${fileName}"`,
				"Cache-Control": "no-store",
			},
		});
	} catch (error) {
		logApiError("[commercial/order-deliveries/[id]/qr-pdf][GET]", error);
		return jsonFromError(error, "Error al generar la etiqueta del reparto");
	}
}
