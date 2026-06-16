import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	forbiddenError,
	getSessionUser,
	jsonFromError,
	unauthorizedError,
} from "@/lib/api/server";
import { listTrainingEventsForUser } from "@/lib/typeorm/services/communications/communications";

export async function GET(request: Request) {
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
		const trainings = await listTrainingEventsForUser(user.id);

		return NextResponse.json(trainings, { status: 200 });
	} catch (error) {
		console.error("[communications/trainings][GET] error:", error);
		return jsonFromError(error, "Error al listar formaciones");
	}
}
