import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	enforceApiRateLimit,
	jsonFromError,
	notFoundError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import { getUserRequestById } from "@/lib/typeorm/services/users/request";

// GET /api/admin/user-requests/[id]
// Obtiene el detalle completo de una solicitud de registro concreta.
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
		const request = await getUserRequestById(id);

		if (!request) {
			return notFoundError("Solicitud no encontrada");
		}

		return NextResponse.json(request, { status: 200 });
	} catch (error) {
		console.error("Error getting user request by id:", error);
		return jsonFromError(error, "Error interno del servidor");
	}
}
