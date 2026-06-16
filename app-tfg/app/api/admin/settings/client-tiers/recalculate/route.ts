import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	jsonFromError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import { recalculateClientTiersByPolicy } from "@/lib/typeorm/services/clients/client-tier-settings";

export async function POST(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const result = await recalculateClientTiersByPolicy(user.id);
		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		console.error("[admin/settings/client-tiers/recalculate][POST] error:", error);
		return jsonFromError(error, "Error al recalcular los rangos de clientes");
	}
}
