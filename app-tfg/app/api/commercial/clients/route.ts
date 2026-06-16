import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	jsonFromError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import { listClientsByCommercialId } from "@/lib/typeorm/services/commercial/client";
import { requireCommercialByUserId } from "@/lib/typeorm/services/commercial/commercial";

// GET /api/commercial/clients
// Lista los clientes actualmente asignados al comercial autenticado.
export async function GET(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const commercial = await requireCommercialByUserId(user.id);
		const clients = await listClientsByCommercialId(commercial.id);

		return NextResponse.json(clients, { status: 200 });
	} catch (error) {
		console.error("[commercial/clients][GET] error:", error);
		return jsonFromError(error, "Error al obtener los clientes del comercial");
	}
}
