import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	buildCreateSalonServiceInput,
	type CreateSalonServiceBody,
} from "@/lib/contracts/salon";
import {
	enforceApiRateLimit,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import { createSalonServiceForClientUser } from "@/lib/typeorm/services/salon/salon-client";

export async function POST(request: Request, context: RouteContext) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const body = await readJsonBody<CreateSalonServiceBody>(request);
		const detail = await createSalonServiceForClientUser(
			user.id,
			id,
			buildCreateSalonServiceInput(body),
		);

		return NextResponse.json(detail, { status: 201 });
	} catch (error) {
		console.error("[clients/salon-clients/[id]/services][POST] error:", error);
		return jsonFromError(error, "Error al registrar el servicio técnico");
	}
}
