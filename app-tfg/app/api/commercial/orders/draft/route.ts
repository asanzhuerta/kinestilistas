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
import type { SaveCommercialOrderDraftBody } from "@/lib/contracts/order";
import { buildSaveCommercialOrderDraftInput } from "@/lib/contracts/order";
import {
	clearDraftForCommercialUser,
	getDraftOrderForCommercialUser,
	saveDraftForCommercialUser,
} from "@/lib/typeorm/services/orders/order";

export async function GET(request: Request) {
	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const searchParams = getRequestSearchParams(request);
		const draftOrder = await getDraftOrderForCommercialUser(user.id, {
			clientId: searchParams.get("clientId"),
		});

		return NextResponse.json(draftOrder, { status: 200 });
	} catch (error) {
		logApiError("[commercial/orders/draft][GET]", error);
		return jsonFromError(error, "Error al obtener el pedido en curso");
	}
}

export async function PUT(request: Request) {
	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<SaveCommercialOrderDraftBody>(request);
		const input = buildSaveCommercialOrderDraftInput(body);

		if (!String(input.clientId ?? "").trim()) {
			return badRequestError(
				"Debes indicar un cliente para guardar el pedido en curso",
				"ORDER_CLIENT_REQUIRED",
			);
		}

		const draftOrder = await saveDraftForCommercialUser(user.id, {
			clientId: String(input.clientId),
			fulfillmentMethod: input.fulfillmentMethod,
			notes: input.notes,
			lines: input.lines,
		});

		return NextResponse.json(draftOrder, { status: 200 });
	} catch (error) {
		logApiError("[commercial/orders/draft][PUT]", error);
		return jsonFromError(error, "Error al guardar el pedido en curso");
	}
}

export async function DELETE(request: Request) {
	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const searchParams = getRequestSearchParams(request);
		const clientId = String(searchParams.get("clientId") ?? "").trim();

		if (!clientId) {
			return badRequestError(
				"Debes indicar un cliente para vaciar el pedido en curso",
				"ORDER_CLIENT_REQUIRED",
			);
		}

		await clearDraftForCommercialUser(user.id, { clientId });
		return NextResponse.json({ ok: true }, { status: 200 });
	} catch (error) {
		logApiError("[commercial/orders/draft][DELETE]", error);
		return jsonFromError(error, "Error al vaciar el pedido en curso");
	}
}
