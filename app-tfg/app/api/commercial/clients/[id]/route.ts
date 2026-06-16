import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	enforceApiRateLimit,
	forbiddenError,
	jsonFromError,
	notFoundError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import { getClientById } from "@/lib/typeorm/services/commercial/client";
import { canCommercialAccessClient } from "@/lib/typeorm/services/commercial/client-commercial-assignment";
import { requireCommercialByUserId } from "@/lib/typeorm/services/commercial/commercial";

// GET /api/commercial/clients/[id]
// Obtiene el detalle operativo de un cliente concreto dentro de la cartera del comercial autenticado.
export async function GET(request: Request, context: RouteContext) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;

		const commercial = await requireCommercialByUserId(user.id);

		const allowed = await canCommercialAccessClient(commercial.id, id);

		if (!allowed) {
			return forbiddenError("Cliente no asignado a este comercial");
		}

		const client = await getClientById(id);

		if (!client) {
			return notFoundError("Cliente no encontrado");
		}

		return NextResponse.json(client, { status: 200 });
	} catch (error) {
		console.error("[commercial/clients/[id]][GET] error:", error);
		return jsonFromError(error, "Error al obtener el cliente del comercial");
	}
}
