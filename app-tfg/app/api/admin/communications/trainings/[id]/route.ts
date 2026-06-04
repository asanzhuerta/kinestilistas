import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
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

export async function GET(_: Request, context: RouteContext) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const trainingEvent = await getTrainingEventById(id);

		if (!trainingEvent) {
			return notFoundError("Formacion no encontrada", "TRAINING_NOT_FOUND");
		}

		return NextResponse.json(trainingEvent, { status: 200 });
	} catch (error) {
		console.error("[admin/communications/trainings/[id]][GET] error:", error);
		return jsonFromError(error, "Error al obtener formacion");
	}
}

export async function PATCH(request: Request, context: RouteContext) {
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
		return jsonFromError(error, "Error al actualizar formacion");
	}
}

export async function DELETE(_: Request, context: RouteContext) {
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
		return jsonFromError(error, "Error al eliminar formacion");
	}
}
