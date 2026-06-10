import { NextResponse } from "next/server";
import {
	jsonFromError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import { listOrderProductOptionsForClientUser } from "@/lib/typeorm/services/orders/order";

export async function GET() {
	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const productOptions = await listOrderProductOptionsForClientUser(user.id);
		return NextResponse.json(productOptions, { status: 200 });
	} catch (error) {
		console.error("[clients/orders/product-options][GET] error:", error);
		return jsonFromError(error, "Error al obtener las referencias de pedido");
	}
}
