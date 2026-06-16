import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	enforceApiRateLimit,
	forbiddenError,
	getSessionUser,
	jsonFromError,
	readJsonBody,
	unauthorizedError,
} from "@/lib/api/server";
import type { TrainingEnrollmentBody } from "@/lib/contracts/communications";
import { buildTrainingEnrollmentInput } from "@/lib/contracts/communications";
import {
	cancelTrainingEnrollment,
	enrollTrainingEvent,
} from "@/lib/typeorm/services/communications/communications";

export async function POST(request: Request, context: RouteContext) {
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
		const body = await readJsonBody<TrainingEnrollmentBody>(request);
		const enrollment = await enrollTrainingEvent({
			userId: user.id,
			trainingEventId: id,
			...buildTrainingEnrollmentInput(body),
		});

		return NextResponse.json(enrollment, { status: 201 });
	} catch (error) {
		console.error("[communications/trainings/[id]/enrollment][POST] error:", error);
		return jsonFromError(error, "Error al inscribirse en la formación");
	}
}

export async function DELETE(request: Request, context: RouteContext) {
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
		const enrollment = await cancelTrainingEnrollment({
			userId: user.id,
			trainingEventId: id,
		});

		return NextResponse.json(enrollment, { status: 200 });
	} catch (error) {
		console.error("[communications/trainings/[id]/enrollment][DELETE] error:", error);
		return jsonFromError(error, "Error al cancelar la inscripción");
	}
}
