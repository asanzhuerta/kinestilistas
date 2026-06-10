import { NextResponse } from "next/server";
import {
	getRequestSearchParams,
	jsonFromError,
	logApiError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import { listOrderProductOptionsForCommercialUser } from "@/lib/typeorm/services/orders/order";

export async function GET(request: Request) {
	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const searchParams = getRequestSearchParams(request);
		const productOptions = await listOrderProductOptionsForCommercialUser(
			user.id,
			{
				clientId: searchParams.get("clientId"),
			},
		);

		return NextResponse.json(productOptions, { status: 200 });
	} catch (error) {
		logApiError("[commercial/orders/product-options][GET]", error);
		return jsonFromError(error, "Error al obtener las referencias de pedido");
	}
}
