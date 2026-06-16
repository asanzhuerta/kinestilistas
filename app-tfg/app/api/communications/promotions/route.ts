import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	forbiddenError,
	getSessionUser,
	jsonFromError,
	unauthorizedError,
} from "@/lib/api/server";
import { listPromotionsForUser } from "@/lib/typeorm/services/communications/communications";

export async function GET(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await getSessionUser();

	if (!user) {
		return unauthorizedError();
	}

	if (!["client", "commercial"].includes(user.role)) {
		return forbiddenError("No autorizado", "COMMUNICATIONS_ROLE_FORBIDDEN");
	}

	try {
		const promotions = await listPromotionsForUser({
			userId: user.id,
			role: user.role,
		});

		return NextResponse.json(promotions, { status: 200 });
	} catch (error) {
		console.error("[communications/promotions][GET] error:", error);
		return jsonFromError(error, "Error al listar promociones");
	}
}
