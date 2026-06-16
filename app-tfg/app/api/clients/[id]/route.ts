import { NextResponse } from "next/server";
import { auth } from "@/auth";import { canReadClient, canUpdateClient } from "@/lib/api/client-access";
import {
	enforceApiRateLimit,
	jsonFromError,
	notFoundError,
	readJsonBody,
	unauthorizedError,
} from "@/lib/api/server";
import type { RouteContext, SessionLike } from "@/lib/contracts/api";
import {
	buildUpdateClientInput,
	type UpdateClientRequestBody,
} from "@/lib/contracts/client-write";
import {
	getClientById,
	updateClient,
} from "@/lib/typeorm/services/commercial/client";

// GET /api/clients/[id]
// Obtiene la ficha de un cliente concreto si el usuario autenticado tiene acceso a ella.
export async function GET(request: Request, context: RouteContext) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	try {
		const session = (await auth()) as SessionLike;
		const { id } = await context.params;

		if (!session?.user) {
			return unauthorizedError();
		}

		const client = await getClientById(id);

		if (!client) {
			return notFoundError("Cliente no encontrado");
		}

		if (!canReadClient(session, client)) {
			return unauthorizedError();
		}

		return NextResponse.json(client, { status: 200 });
	} catch (error) {
		console.error("[clients/[id]][GET] error:", error);
		return jsonFromError(error, "Error al obtener el cliente");
	}
}

// PATCH /api/clients/[id]
// Actualiza los datos editables de un cliente concreto respetando las reglas de acceso.
export async function PATCH(request: Request, context: RouteContext) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	try {
		const session = (await auth()) as SessionLike;
		const { id } = await context.params;

		if (!session?.user) {
			return unauthorizedError();
		}

		const existingClient = await getClientById(id);

		if (!existingClient) {
			return notFoundError("Cliente no encontrado");
		}

		if (!canUpdateClient(session, existingClient)) {
			return unauthorizedError();
		}

		const body = await readJsonBody<UpdateClientRequestBody>(request);
		await updateClient(buildUpdateClientInput(id, body, existingClient));

		return NextResponse.json(
			{ message: "Cliente actualizado correctamente" },
			{ status: 200 },
		);
	} catch (error) {
		console.error("[clients/[id]][PATCH] error:", error);
		return jsonFromError(error, "Error al actualizar el cliente");
	}
}
