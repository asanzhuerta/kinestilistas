import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	enforceApiRateLimit,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { UpdateAdminUserStatusBody } from "@/lib/contracts/admin-user";
import { updateUserStatus } from "@/lib/typeorm/services/users/status";

// PATCH /api/admin/users/[id]/status
// PATCH /api/admin/users/[id]/status
// Cambia el estado de un usuario desde administración y registra la auditoría correspondiente.
export async function PATCH(request: Request, context: RouteContext) {
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
		const body = await readJsonBody<UpdateAdminUserStatusBody>(request);

		const updatedUser = await updateUserStatus({
			userId: id,
			newStatusId: Number(body.statusId),
			performedByUserId: user.id,
			reason: body.reason ?? null,
			notes: body.notes ?? null,
		});

		return NextResponse.json(updatedUser, { status: 200 });
	} catch (error) {
		console.error("Error updating user status:", error);
		return jsonFromError(error, "Error interno del servidor");
	}
}
