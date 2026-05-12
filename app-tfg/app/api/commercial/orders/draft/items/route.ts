import { NextResponse } from "next/server";
import {
	badRequestError,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { AddCommercialDraftOrderLineBody } from "@/lib/contracts/order";
import { buildAddCommercialDraftOrderLineInput } from "@/lib/contracts/order";
import { addLineToDraftForCommercialUser } from "@/lib/typeorm/services/orders/order";

export async function POST(request: Request) {
	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<AddCommercialDraftOrderLineBody>(request);
		const input = buildAddCommercialDraftOrderLineInput(body);

		if (!String(input.clientId ?? "").trim()) {
			return badRequestError(
				"Debes indicar un cliente para anadir la linea al pedido en curso",
				"ORDER_CLIENT_REQUIRED",
			);
		}

		if (!String(input.productId ?? "").trim()) {
			return badRequestError(
				"Debes indicar un producto para anadirlo al pedido en curso",
				"ORDER_DRAFT_PRODUCT_REQUIRED",
			);
		}

		const draftOrder = await addLineToDraftForCommercialUser(user.id, {
			clientId: String(input.clientId),
			productId: String(input.productId),
			colorReferenceId: input.colorReferenceId ?? null,
			quantity: input.quantity ?? 1,
		});

		return NextResponse.json(draftOrder, { status: 200 });
	} catch (error) {
		console.error("[commercial/orders/draft/items][POST] error:", error);
		return jsonFromError(error, "Error al anadir la linea al pedido en curso");
	}
}
