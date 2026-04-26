import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	forbiddenError,
	getSessionUser,
	jsonFromError,
	readJsonBody,
	unauthorizedError,
} from "@/lib/api/server";
import { updateUserStatus } from "@/lib/typeorm/services/users/status";

type UpdateUserStatusBody = {
	statusId?: number | string;
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
		const body = await readJsonBody<UpdateUserStatusBody>(request);

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
