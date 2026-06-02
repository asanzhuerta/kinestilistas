import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import type { UpdateOrderStatusBody } from "@/lib/contracts/order";
import { buildUpdateOrderStatusInput } from "@/lib/contracts/order";
import {
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	getOrderDetailForAdmin,
	updateOrderStatusForAdmin,
} from "@/lib/typeorm/services/orders/order";

export async function GET(_: Request, context: RouteContext) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const detail = await getOrderDetailForAdmin(id);
		return NextResponse.json(detail, { status: 200 });
	} catch (error) {
		console.error("[admin/orders/[id]][GET] error:", error);
		return jsonFromError(error, "Error al obtener el detalle del pedido");
	}
}

export async function PATCH(request: Request, context: RouteContext) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const body = await readJsonBody<UpdateOrderStatusBody>(request);
		const input = buildUpdateOrderStatusInput(body);
		const detail = await updateOrderStatusForAdmin({
			orderId: id,
			actedByUserId: user.id,
			statusId: input.statusId,
			paymentStatusId: input.paymentStatusId,
			paymentMethod: input.paymentMethod,
			paymentNotes: input.paymentNotes,
		});

		return NextResponse.json(detail, { status: 200 });
	} catch (error) {
		console.error("[admin/orders/[id]][PATCH] error:", error);
		return jsonFromError(error, "Error al actualizar el estado del pedido");
	}
}
