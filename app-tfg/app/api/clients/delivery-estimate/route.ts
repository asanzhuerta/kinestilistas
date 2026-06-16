import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	jsonFromError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import { getClientDeliveryEstimate } from "@/lib/clients/delivery-estimate";

// GET /api/clients/delivery-estimate
// Devuelve al cliente la hora estimada de llegada de su reparto planificado para hoy.
export async function GET(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const response = await getClientDeliveryEstimate(user.id);
		return NextResponse.json(response, { status: 200 });
	} catch (error) {
		console.error("[clients/delivery-estimate][GET] error:", error);
		return jsonFromError(error, "Error al calcular la hora aproximada de reparto");
	}
}
