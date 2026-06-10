import { NextResponse } from "next/server";
import {
	badRequestError,
	jsonFromError,
	logApiError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { AddClientDraftOrderLineBody } from "@/lib/contracts/order";
import { buildAddClientDraftOrderLineInput } from "@/lib/contracts/order";
import { addLineToDraftForClientUser } from "@/lib/typeorm/services/orders/order";

export async function POST(request: Request) {
	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<AddClientDraftOrderLineBody>(request);
		const input = buildAddClientDraftOrderLineInput(body);

		if (!String(input.productId ?? "").trim()) {
			return badRequestError(
				"Debes indicar un producto para añadirlo al pedido en curso",
				"ORDER_DRAFT_PRODUCT_REQUIRED",
			);
		}

		const draftOrder = await addLineToDraftForClientUser(user.id, {
			productId: String(input.productId),
			colorReferenceId: input.colorReferenceId ?? null,
			quantity: input.quantity ?? 1,
		});
		return NextResponse.json(draftOrder, { status: 200 });
	} catch (error) {
		logApiError("[clients/orders/draft/items][POST]", error);
		return jsonFromError(error, "Error al añadir la línea al pedido en curso");
	}
}
