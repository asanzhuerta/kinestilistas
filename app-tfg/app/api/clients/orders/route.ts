import { NextResponse } from "next/server";
import {
	jsonFromError,
	logApiError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { CreateClientOrderBody } from "@/lib/contracts/order";
import { buildCreateClientOrderInput } from "@/lib/contracts/order";
import {
	createOrderForClientUser,
	listOrdersForClientUser,
} from "@/lib/typeorm/services/orders/order";

export async function GET() {
	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const orders = await listOrdersForClientUser(user.id);
		return NextResponse.json(orders, { status: 200 });
	} catch (error) {
		logApiError("[clients/orders][GET]", error);
		return jsonFromError(error, "Error al obtener los pedidos del cliente");
	}
}

export async function POST(request: Request) {
	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<CreateClientOrderBody>(request);
		const order = await createOrderForClientUser(
			user.id,
			buildCreateClientOrderInput(body),
		);

		return NextResponse.json(order, { status: 201 });
	} catch (error) {
		logApiError("[clients/orders][POST]", error);
		return jsonFromError(error, "Error al crear el pedido");
	}
}
