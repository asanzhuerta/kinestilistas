import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import type { RegisterOrderPaymentBody } from "@/lib/contracts/order";
import { buildRegisterOrderPaymentInput } from "@/lib/contracts/order";
import {
	jsonFromError,
	logApiError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import { registerOrderPaymentForAdmin } from "@/lib/typeorm/services/orders/order";

export async function POST(request: Request, context: RouteContext) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const body = await readJsonBody<RegisterOrderPaymentBody>(request);
		const input = buildRegisterOrderPaymentInput(body);
		const detail = await registerOrderPaymentForAdmin({
			actedByUserId: user.id,
			orderId: id,
			amount: input.amount,
			paymentMethod: input.paymentMethod,
			paymentNotes: input.paymentNotes,
		});

		return NextResponse.json(detail, { status: 201 });
	} catch (error) {
		logApiError("[admin/orders/[id]/payments][POST]", error);
		return jsonFromError(error, "Error al registrar el pago del pedido");
	}
}
