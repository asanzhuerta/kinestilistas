import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import { getAdminOperationalOverview } from "@/lib/admin/operational-overview";

export async function GET(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	const overview = await getAdminOperationalOverview();

	return NextResponse.json(overview, { status: 200 });
}
