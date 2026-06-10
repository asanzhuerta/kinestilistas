import type { RouteContext } from "@/lib/contracts/api";
import { jsonFromError, requireRoleUser, unauthorizedError } from "@/lib/api/server";
import { buildOrderQrPdf } from "@/lib/orders/qr-pdf";
import { getOrderDetailForCommercialUser } from "@/lib/typeorm/services/orders/order";

export const runtime = "nodejs";

export async function GET(_: Request, context: RouteContext) {
	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const detail = await getOrderDetailForCommercialUser(user.id, id);
		const pdf = await buildOrderQrPdf(detail.order);
		const fileName = `qr-pedido-${detail.order.id.slice(0, 8)}.pdf`;

		return new Response(pdf, {
			status: 200,
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename="${fileName}"`,
				"Cache-Control": "no-store",
			},
		});
	} catch (error) {
		console.error("[commercial/orders/[id]/qr-pdf][GET] error:", error);
		return jsonFromError(error, "Error al generar el PDF del QR");
	}
}
