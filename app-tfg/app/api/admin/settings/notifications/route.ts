import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { UpdateNotificationDeliverySettingsBody } from "@/lib/contracts/notification-settings";
import {
	listNotificationDeliverySettings,
	updateNotificationDeliverySettings,
} from "@/lib/typeorm/services/communications/notification-settings";

export async function GET(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const settings = await listNotificationDeliverySettings();
		return NextResponse.json(settings, { status: 200 });
	} catch (error) {
		console.error("[admin/settings/notifications][GET] error:", error);
		return jsonFromError(
			error,
			"Error al obtener la configuración de avisos automáticos",
		);
	}
}

export async function PUT(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body =
			await readJsonBody<UpdateNotificationDeliverySettingsBody>(request);
		const settings = await updateNotificationDeliverySettings({
			events: Array.isArray(body.events) ? body.events : [],
		});

		return NextResponse.json(settings, { status: 200 });
	} catch (error) {
		console.error("[admin/settings/notifications][PUT] error:", error);
		return jsonFromError(
			error,
			"Error al guardar la configuración de avisos automáticos",
		);
	}
}
