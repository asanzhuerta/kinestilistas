import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	buildUpdateSalonServiceInput,
	type UpdateSalonServiceBody,
} from "@/lib/contracts/salon";
import {
	enforceApiRateLimit,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	deleteSalonServiceForClientUser,
	updateSalonServiceForClientUser,
} from "@/lib/typeorm/services/salon/salon-client";

type ServiceRouteContext = RouteContext<{
	id: string;
	serviceId: string;
}>;

export async function PATCH(request: Request, context: ServiceRouteContext) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id, serviceId } = await context.params;
		const body = await readJsonBody<UpdateSalonServiceBody>(request);
		const detail = await updateSalonServiceForClientUser(user.id, id, {
			serviceId,
			...buildUpdateSalonServiceInput(body),
		});

		return NextResponse.json(detail, { status: 200 });
	} catch (error) {
		console.error(
			"[clients/salon-clients/[id]/services/[serviceId]][PATCH] error:",
			error,
		);
		return jsonFromError(error, "Error al actualizar el servicio técnico");
	}
}

export async function DELETE(request: Request, context: ServiceRouteContext) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id, serviceId } = await context.params;
		const detail = await deleteSalonServiceForClientUser(user.id, id, serviceId);

		return NextResponse.json(detail, { status: 200 });
	} catch (error) {
		console.error(
			"[clients/salon-clients/[id]/services/[serviceId]][DELETE] error:",
			error,
		);
		return jsonFromError(error, "Error al eliminar el servicio técnico");
	}
}
