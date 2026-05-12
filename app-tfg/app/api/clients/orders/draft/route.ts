import { NextResponse } from "next/server";
import {
	jsonFromError,
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

export async function GET() {
	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const draftOrder = await getDraftOrderForClientUser(user.id);
		return NextResponse.json(draftOrder, { status: 200 });
	} catch (error) {
		console.error("[clients/orders/draft][GET] error:", error);
		return jsonFromError(error, "Error al obtener el pedido en curso");
	}
}

export async function PUT(request: Request) {
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
		console.error("[clients/orders/draft][PUT] error:", error);
		return jsonFromError(error, "Error al guardar el pedido en curso");
	}
}

export async function DELETE() {
	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		await clearDraftForClientUser(user.id);
		return NextResponse.json({ ok: true }, { status: 200 });
	} catch (error) {
		console.error("[clients/orders/draft][DELETE] error:", error);
		return jsonFromError(error, "Error al vaciar el pedido en curso");
	}
}
