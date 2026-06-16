import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	forbiddenError,
	getSessionUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	getVapidPublicKey,
	isPushDeliveryConfigured,
} from "@/lib/notifications/push";

export const runtime = "nodejs";

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
		return forbiddenError("No autorizado", "PUSH_SUBSCRIPTION_ROLE_FORBIDDEN");
	}

	return NextResponse.json(
		{
			configured: isPushDeliveryConfigured(),
			publicKey: getVapidPublicKey(),
		},
		{ status: 200 },
	);
}
