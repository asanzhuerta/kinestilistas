import { NextResponse } from "next/server";
import {
	forbiddenError,
	getSessionUser,
	jsonFromError,
	readJsonBody,
	unauthorizedError,
} from "@/lib/api/server";
import type { UpsertAppReminderBody } from "@/lib/contracts/communications";
import { buildUpsertAppReminderInput } from "@/lib/contracts/communications";
import {
	createReminderForUser,
	listRemindersForUser,
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
		const reminders = await listRemindersForUser(user.id);

		return NextResponse.json(reminders, { status: 200 });
	} catch (error) {
		console.error("[communications/reminders][GET] error:", error);
		return jsonFromError(error, "Error al listar recordatorios");
	}
}

export async function POST(request: Request) {
	const user = await getSessionUser();

	if (!user) {
		return unauthorizedError();
	}

	if (!["client", "commercial"].includes(user.role)) {
		return forbiddenError("No autorizado", "COMMUNICATIONS_ROLE_FORBIDDEN");
	}

	try {
		const body = await readJsonBody<UpsertAppReminderBody>(request);
		const reminder = await createReminderForUser(
			user.id,
			buildUpsertAppReminderInput(body),
		);

		return NextResponse.json(reminder, { status: 201 });
	} catch (error) {
		console.error("[communications/reminders][POST] error:", error);
		return jsonFromError(error, "Error al crear recordatorio");
	}
}
