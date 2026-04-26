import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	badRequestError,
	forbiddenError,
	getSessionUser,
	jsonFromError,
	readJsonBody,
	unauthorizedError,
} from "@/lib/api/server";
import { updateUserRole } from "@/lib/typeorm/services/users/role";

type UpdateUserRoleBody = {
	roleId?: number | string;
	newRoleId?: number | string;
	reason?: string | null;
	notes?: string | null;
};

export async function PATCH(request: Request, context: RouteContext) {
	const user = await getSessionUser();

	if (!user) {
		return unauthorizedError("No autenticado");
	}

	if (user.role !== "admin") {
		return forbiddenError();
	}

	try {
		const { id } = await context.params;
		const body = await readJsonBody<UpdateUserRoleBody>(request);
		const nextRoleId = Number(body.roleId ?? body.newRoleId);

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
