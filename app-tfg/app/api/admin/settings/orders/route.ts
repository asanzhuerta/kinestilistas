import { NextResponse } from "next/server";
import {
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { UpdateOrderBusinessSettingsBody } from "@/lib/contracts/order-settings";
import {
	getOrderBusinessSettings,
	updateOrderBusinessSettings,
} from "@/lib/typeorm/services/orders/order-settings";

export async function GET() {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const settings = await getOrderBusinessSettings();
		return NextResponse.json(settings, { status: 200 });
	} catch (error) {
		console.error("[admin/settings/orders][GET] error:", error);
		return jsonFromError(error, "Error al obtener los ajustes de pedidos");
	}
}

export async function PUT(request: Request) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<UpdateOrderBusinessSettingsBody>(request);
		const settings = await updateOrderBusinessSettings(body);

		return NextResponse.json(settings, { status: 200 });
	} catch (error) {
		console.error("[admin/settings/orders][PUT] error:", error);
		return jsonFromError(error, "Error al guardar los ajustes de pedidos");
	}
}
