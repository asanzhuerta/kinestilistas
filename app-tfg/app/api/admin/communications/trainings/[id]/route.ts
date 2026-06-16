import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	enforceApiRateLimit,
	jsonFromError,
	notFoundError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { AdminUpsertTrainingEventBody } from "@/lib/contracts/communications";
import { buildAdminUpsertTrainingEventInput } from "@/lib/contracts/communications";
import {
	deleteTrainingEvent,
	getTrainingEventById,
	updateTrainingEvent,
} from "@/lib/typeorm/services/communications/communications";

export async function GET(request: Request, context: RouteContext) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const trainingEvent = await getTrainingEventById(id);

		if (!trainingEvent) {
			return notFoundError("Formación no encontrada", "TRAINING_NOT_FOUND");
		}

		return NextResponse.json(trainingEvent, { status: 200 });
	} catch (error) {
		console.error("[admin/communications/trainings/[id]][GET] error:", error);
		return jsonFromError(error, "Error al obtener formación");
	}
}

export async function PATCH(request: Request, context: RouteContext) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const body = await readJsonBody<AdminUpsertTrainingEventBody>(request);
		const trainingEvent = await updateTrainingEvent({
			trainingEventId: id,
			...buildAdminUpsertTrainingEventInput(body),
		});

		return NextResponse.json(trainingEvent, { status: 200 });
	} catch (error) {
		console.error("[admin/communications/trainings/[id]][PATCH] error:", error);
		return jsonFromError(error, "Error al actualizar formación");
	}
}

export async function DELETE(request: Request, context: RouteContext) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const deleted = await deleteTrainingEvent(id);

		return NextResponse.json(deleted, { status: 200 });
	} catch (error) {
		console.error("[admin/communications/trainings/[id]][DELETE] error:", error);
		return jsonFromError(error, "Error al eliminar formación");
	}
}
