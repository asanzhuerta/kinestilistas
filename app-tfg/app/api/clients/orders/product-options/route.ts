import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	jsonFromError,
	logApiError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import { listOrderProductOptionsForClientUser } from "@/lib/typeorm/services/orders/order";

export async function GET(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const productOptions = await listOrderProductOptionsForClientUser(user.id);
		return NextResponse.json(productOptions, { status: 200 });
	} catch (error) {
		logApiError("[clients/orders/product-options][GET]", error);
		return jsonFromError(error, "Error al obtener las referencias de pedido");
	}
}
