import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	jsonFromError,
	logApiError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { SaveClientOrderDraftBody } from "@/lib/contracts/order";
import { buildSaveClientOrderDraftInput } from "@/lib/contracts/order";
import {
	clearDraftForClientUser,
	getDraftOrderForClientUser,
	saveDraftForClientUser,
} from "@/lib/typeorm/services/orders/order";

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
		const draftOrder = await getDraftOrderForClientUser(user.id);
		return NextResponse.json(draftOrder, { status: 200 });
	} catch (error) {
		logApiError("[clients/orders/draft][GET]", error);
		return jsonFromError(error, "Error al obtener el pedido en curso");
	}
}

export async function PUT(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<SaveClientOrderDraftBody>(request);
		const draftOrder = await saveDraftForClientUser(
			user.id,
			buildSaveClientOrderDraftInput(body),
		);

		return NextResponse.json(draftOrder, { status: 200 });
	} catch (error) {
		logApiError("[clients/orders/draft][PUT]", error);
		return jsonFromError(error, "Error al guardar el pedido en curso");
	}
}

export async function DELETE(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		await clearDraftForClientUser(user.id);
		return NextResponse.json({ ok: true }, { status: 200 });
	} catch (error) {
		logApiError("[clients/orders/draft][DELETE]", error);
		return jsonFromError(error, "Error al vaciar el pedido en curso");
	}
}
