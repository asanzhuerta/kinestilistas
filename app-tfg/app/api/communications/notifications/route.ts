import { NextResponse } from "next/server";
import {
	forbiddenError,
	getSessionUser,
	jsonFromError,
	unauthorizedError,
} from "@/lib/api/server";
import {
	listNotificationsForUser,
	markAllNotificationsRead,
} from "@/lib/typeorm/services/communications/communications";

export async function GET() {
	const user = await getSessionUser();

	if (!user) {
		return unauthorizedError();
	}

	if (!["client", "commercial"].includes(user.role)) {
		return forbiddenError("No autorizado", "COMMUNICATIONS_ROLE_FORBIDDEN");
	}

	try {
		const notifications = await listNotificationsForUser(user.id);

		return NextResponse.json(notifications, { status: 200 });
	} catch (error) {
		console.error("[communications/notifications][GET] error:", error);
		return jsonFromError(error, "Error al listar notificaciones");
	}
}

export async function PATCH() {
	const user = await getSessionUser();

	if (!user) {
		return unauthorizedError();
	}

	if (!["client", "commercial"].includes(user.role)) {
		return forbiddenError("No autorizado", "COMMUNICATIONS_ROLE_FORBIDDEN");
	}

	try {
		const result = await markAllNotificationsRead(user.id);

		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		console.error("[communications/notifications][PATCH] error:", error);
		return jsonFromError(error, "Error al marcar notificaciones");
	}
}
