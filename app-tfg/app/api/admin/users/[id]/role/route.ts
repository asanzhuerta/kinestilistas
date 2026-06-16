import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	enforceApiRateLimit,
	badRequestError,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { UpdateAdminUserRoleBody } from "@/lib/contracts/admin-user";
import { resolveNextAdminRoleId } from "@/lib/typeorm/services/users/admin-user-role-resolvers";
import { updateUserRole } from "@/lib/typeorm/services/users/role";

// PATCH /api/admin/users/[id]/role
// PATCH /api/admin/users/[id]/role
// Cambia el rol de un usuario desde administración y registra la auditoría correspondiente.
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
		const body = await readJsonBody<UpdateAdminUserRoleBody>(request);
		const nextRoleId = resolveNextAdminRoleId(body);

		if (!Number.isInteger(nextRoleId) || nextRoleId <= 0) {
			return badRequestError("El nuevo rol es obligatorio");
		}

		const updatedUser = await updateUserRole({
			userId: id,
			newRoleId: nextRoleId,
			performedByUserId: user.id,
			reason: body.reason ?? null,
			notes: body.notes ?? null,
		});

		return NextResponse.json(updatedUser, { status: 200 });
	} catch (error) {
		console.error("Error updating user role:", error);
		return jsonFromError(error, "Error interno del servidor");
	}
}
