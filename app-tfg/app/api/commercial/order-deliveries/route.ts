import { NextResponse } from "next/server";
import {
	getRequestSearchParams,
	jsonFromError,
	logApiError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { PrepareOrderDeliveryBody } from "@/lib/contracts/order";
import { buildPrepareOrderDeliveryInput } from "@/lib/contracts/order";
import {
	listOrderDeliveriesForCommercialUser,
	listPendingOrderDeliveryPreparationsForCommercialUser,
	prepareOrderDeliveryForCommercialUser,
} from "@/lib/typeorm/services/orders/order-delivery";

export async function GET(request: Request) {
	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const searchParams = getRequestSearchParams(request);
		const mode = String(searchParams.get("mode") ?? "").trim();

		if (mode === "preparation") {
			const pendingOrders =
				await listPendingOrderDeliveryPreparationsForCommercialUser(user.id, {
					clientId: searchParams.get("clientId"),
				});

			return NextResponse.json(pendingOrders, { status: 200 });
		}

		const deliveries = await listOrderDeliveriesForCommercialUser(user.id, {
			clientId: searchParams.get("clientId"),
			fulfillmentMethod: searchParams.get("fulfillmentMethod"),
			status:
				searchParams.get("status") === "open"
					? "open"
					: searchParams.get("status") === "prepared"
						? "prepared"
						: searchParams.get("status") === "planned"
							? "planned"
							: searchParams.get("status") === "delivered"
								? "delivered"
								: searchParams.get("status") === "cancelled"
									? "cancelled"
									: null,
		});

		return NextResponse.json(deliveries, { status: 200 });
	} catch (error) {
		logApiError("[commercial/order-deliveries][GET]", error);
		return jsonFromError(error, "Error al obtener los repartos");
	}
}

export async function POST(request: Request) {
	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<PrepareOrderDeliveryBody>(request);
		const input = buildPrepareOrderDeliveryInput(body);
		const delivery = await prepareOrderDeliveryForCommercialUser(user.id, input);

		return NextResponse.json(delivery, { status: 201 });
	} catch (error) {
		logApiError("[commercial/order-deliveries][POST]", error);
		return jsonFromError(error, "Error al preparar el reparto");
	}
}
