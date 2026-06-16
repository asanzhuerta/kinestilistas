import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	jsonFromError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import { getEnterpriseOperationsSnapshot } from "@/lib/typeorm/services/admin/enterprise-operations";

export async function GET(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const snapshot = await getEnterpriseOperationsSnapshot();
		return NextResponse.json(snapshot, { status: 200 });
	} catch (error) {
		console.error("[admin/enterprise-operations][GET] error:", error);
		return jsonFromError(error, "Error al obtener la operación empresarial");
	}
}
