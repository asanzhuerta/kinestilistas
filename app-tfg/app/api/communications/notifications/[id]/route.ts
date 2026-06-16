import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	enforceApiRateLimit,
	forbiddenError,
	getSessionUser,
	jsonFromError,
	unauthorizedError,
} from "@/lib/api/server";
import { markNotificationRead } from "@/lib/typeorm/services/communications/communications";

export async function PATCH(request: Request, context: RouteContext) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await getSessionUser();

	if (!user) {
		return unauthorizedError();
	}

	if (!["client", "commercial"].includes(user.role)) {
		return forbiddenError("No autorizado", "COMMUNICATIONS_ROLE_FORBIDDEN");
	}

	try {
		const { id } = await context.params;
		const notification = await markNotificationRead({
			userId: user.id,
			notificationId: id,
		});

		return NextResponse.json(notification, { status: 200 });
	} catch (error) {
		console.error("[communications/notifications/[id]][PATCH] error:", error);
		return jsonFromError(error, "Error al marcar notificación");
	}
}
