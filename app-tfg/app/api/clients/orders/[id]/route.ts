import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	enforceApiRateLimit,
	jsonFromError,
	logApiError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import { getOrderDetailForClientUser } from "@/lib/typeorm/services/orders/order";

export async function GET(request: Request, context: RouteContext) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const detail = await getOrderDetailForClientUser(user.id, id);
		return NextResponse.json(detail, { status: 200 });
	} catch (error) {
		logApiError("[clients/orders/[id]][GET]", error);
		return jsonFromError(error, "Error al obtener el detalle del pedido");
	}
}
