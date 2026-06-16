import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	enforceApiRateLimit,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { ApproveUserRequestBody } from "@/lib/contracts/user-request";
import { approveUserRequest } from "@/lib/typeorm/services/users/request";

// POST /api/admin/user-requests/[id]/approve
// Aprueba una solicitud de registro y crea el usuario definitivo, con comercial opcional para clientes.
export async function POST(request: Request, context: RouteContext) {
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
		const body = (await readJsonBody<ApproveUserRequestBody>(request).catch(
			() => null,
		)) as ApproveUserRequestBody | null;
		const result = await approveUserRequest(
			id,
			user.id,
			body?.commercialId ?? null,
		);

		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		console.error("Error approving user request:", error);
		return jsonFromError(error, "Error interno del servidor");
	}
}
