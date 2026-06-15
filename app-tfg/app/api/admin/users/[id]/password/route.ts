import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	badRequestError,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { ChangeAdminUserPasswordBody } from "@/lib/contracts/admin-user";
import { changeUserPassword } from "@/lib/typeorm/services/users/password";

// PATCH /api/admin/users/[id]/password
// PATCH /api/admin/users/[id]/password
// Cambia la contraseña de un usuario desde administración y registra la acción.
export async function PATCH(request: Request, context: RouteContext) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const body = await readJsonBody<ChangeAdminUserPasswordBody>(request);

		if (!body.newPassword || typeof body.newPassword !== "string") {
			return badRequestError("La nueva contraseña es obligatoria");
		}

		const result = await changeUserPassword({
			userId: id,
			newPassword: body.newPassword,
			performedByUserId: user.id,
			reason: body.reason ?? null,
			notes: body.notes ?? null,
			mode: "admin",
		});

		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		console.error("Error changing user password:", error);
		return jsonFromError(error, "Error interno del servidor");
	}
}
