import { NextResponse } from "next/server";
import {
	getRequestSearchParams,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { AdminUpsertTrainingEventBody } from "@/lib/contracts/communications";
import { buildAdminUpsertTrainingEventInput } from "@/lib/contracts/communications";
import {
	createTrainingEvent,
	listAdminTrainingEvents,
} from "@/lib/typeorm/services/communications/communications";

export async function GET(request: Request) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const searchParams = getRequestSearchParams(request);
		const trainings = await listAdminTrainingEvents({
			search: searchParams.get("search"),
		});

		return NextResponse.json(trainings, { status: 200 });
	} catch (error) {
		console.error("[admin/communications/trainings][GET] error:", error);
		return jsonFromError(error, "Error al listar formaciones");
	}
}

export async function POST(request: Request) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<AdminUpsertTrainingEventBody>(request);
		const trainingEvent = await createTrainingEvent({
			...buildAdminUpsertTrainingEventInput(body),
			createdByUserId: user.id,
		});

		return NextResponse.json(trainingEvent, { status: 201 });
	} catch (error) {
		console.error("[admin/communications/trainings][POST] error:", error);
		return jsonFromError(error, "Error al crear formacion");
	}
}
