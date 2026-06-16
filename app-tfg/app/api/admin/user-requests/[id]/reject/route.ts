import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	enforceApiRateLimit,
	badRequestError,
	jsonFromError,
	readOptionalStringField,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { RejectUserRequestBody } from "@/lib/contracts/user-request";
import { rejectUserRequest } from "@/lib/typeorm/services/users/request";

// POST /api/admin/user-requests/[id]/reject
// Rechaza una solicitud de registro guardando el motivo indicado por administración.
export async function POST(request: Request, { params }: RouteContext) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await params;
		const reason = await readOptionalStringField(request, "reason");
		const normalizedBody: RejectUserRequestBody = { reason };

		if (!normalizedBody.reason) {
			return badRequestError("Debes indicar un motivo de rechazo");
		}

		await rejectUserRequest(id, user.id, normalizedBody.reason);
		return NextResponse.json({ ok: true }, { status: 200 });
	} catch (error) {
		console.error("Error rejecting user request:", error);
		return jsonFromError(error, "Error al rechazar la solicitud");
	}
}
