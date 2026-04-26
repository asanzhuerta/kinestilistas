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
import { changeUserPassword } from "@/lib/typeorm/services/users/password";

type ChangeUserPasswordBody = {
	newPassword?: string;
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
		const body = await readJsonBody<ChangeUserPasswordBody>(request);

		if (!body.newPassword || typeof body.newPassword !== "string") {
			return badRequestError("La nueva contrasena es obligatoria");
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
