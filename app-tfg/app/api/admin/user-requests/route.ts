import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	jsonFromError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import { listUserRequests } from "@/lib/typeorm/services/users/request";

// GET /api/admin/user-requests
// Lista las solicitudes de registro pendientes o históricas para su revisión administrativa.
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
		const requests = await listUserRequests();
		return NextResponse.json(requests, { status: 200 });
	} catch (error) {
		console.error("Error listing user requests:", error);
		return jsonFromError(error, "Error interno del servidor");
	}
}
