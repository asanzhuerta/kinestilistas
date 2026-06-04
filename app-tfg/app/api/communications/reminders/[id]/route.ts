import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	forbiddenError,
	getSessionUser,
	jsonFromError,
	readJsonBody,
	unauthorizedError,
} from "@/lib/api/server";
import type { UpsertAppReminderBody } from "@/lib/contracts/communications";
import { updateReminderStatus } from "@/lib/typeorm/services/communications/communications";

export async function PATCH(request: Request, context: RouteContext) {
	const user = await getSessionUser();

	if (!user) {
		return unauthorizedError();
	}

	if (!["client", "commercial"].includes(user.role)) {
		return forbiddenError("No autorizado", "COMMUNICATIONS_ROLE_FORBIDDEN");
	}

	try {
		const { id } = await context.params;
		const body = await readJsonBody<UpsertAppReminderBody>(request);
		const reminder = await updateReminderStatus({
			userId: user.id,
			reminderId: id,
			status: body.status ?? "pending",
		});

		return NextResponse.json(reminder, { status: 200 });
	} catch (error) {
		console.error("[communications/reminders/[id]][PATCH] error:", error);
		return jsonFromError(error, "Error al actualizar recordatorio");
	}
}
