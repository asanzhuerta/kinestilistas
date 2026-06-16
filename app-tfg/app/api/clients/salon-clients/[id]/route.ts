import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	buildUpdateSalonClientInput,
	type UpdateSalonClientBody,
} from "@/lib/contracts/salon";
import {
	enforceApiRateLimit,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	getSalonClientDetailForClientUser,
	updateSalonClientForClientUser,
} from "@/lib/typeorm/services/salon/salon-client";

export async function GET(request: Request, context: RouteContext) {
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
		const detail = await getSalonClientDetailForClientUser(user.id, id);
		return NextResponse.json(detail, { status: 200 });
	} catch (error) {
		console.error("[clients/salon-clients/[id]][GET] error:", error);
		return jsonFromError(error, "Error al obtener la ficha técnica");
	}
}

export async function PATCH(request: Request, context: RouteContext) {
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
		const body = await readJsonBody<UpdateSalonClientBody>(request);
		const salonClient = await updateSalonClientForClientUser(user.id, {
			salonClientId: id,
			...buildUpdateSalonClientInput(body),
		});

		return NextResponse.json(salonClient, { status: 200 });
	} catch (error) {
		console.error("[clients/salon-clients/[id]][PATCH] error:", error);
		return jsonFromError(error, "Error al actualizar la ficha técnica");
	}
}
