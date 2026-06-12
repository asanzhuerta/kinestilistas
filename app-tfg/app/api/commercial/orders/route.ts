import { NextResponse } from "next/server";
import {
	badRequestError,
	getRequestSearchParams,
	jsonFromError,
	logApiError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { CreateCommercialOrderBody } from "@/lib/contracts/order";
import { buildCreateCommercialOrderInput } from "@/lib/contracts/order";
import {
	createOrderForCommercialUser,
	listOrdersForCommercialUser,
} from "@/lib/typeorm/services/orders/order";

export async function GET(request: Request) {
	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const searchParams = getRequestSearchParams(request);
		const orders = await listOrdersForCommercialUser(user.id, {
			clientId: searchParams.get("clientId"),
			pendingDeliveryOnly:
				searchParams.get("pendingDeliveryOnly") === "1" ||
				searchParams.get("pendingDeliveryOnly") === "true",
		});

		return NextResponse.json(orders, { status: 200 });
	} catch (error) {
		logApiError("[commercial/orders][GET]", error);
		return jsonFromError(error, "Error al obtener los pedidos del comercial");
	}
}

export async function POST(request: Request) {
	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<CreateCommercialOrderBody>(request);
		const input = buildCreateCommercialOrderInput(body);

		if (!input.clientId) {
			return badRequestError(
				"Debes indicar un cliente para registrar el pedido",
				"ORDER_CLIENT_REQUIRED",
			);
		}

		const order = await createOrderForCommercialUser(
			user.id,
			{
				clientId: input.clientId,
				fulfillmentMethod: input.fulfillmentMethod,
				notes: input.notes,
				lines: input.lines,
			},
		);

		return NextResponse.json(order, { status: 201 });
	} catch (error) {
		logApiError("[commercial/orders][POST]", error);
		return jsonFromError(error, "Error al crear el pedido");
	}
}
