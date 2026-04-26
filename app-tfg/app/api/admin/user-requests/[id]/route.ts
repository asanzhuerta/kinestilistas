import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	forbiddenError,
	getSessionUser,
	jsonFromError,
	notFoundError,
	unauthorizedError,
} from "@/lib/api/server";
import { getUserRequestById } from "@/lib/typeorm/services/users/request";

export async function GET(_: Request, context: RouteContext) {
	const user = await getSessionUser();

	if (!user) {
		return unauthorizedError("No autenticado");
	}

	if (user.role !== "admin") {
		return forbiddenError();
	}

	try {
		const { id } = await context.params;
		const request = await getUserRequestById(id);

		if (!request) {
			return notFoundError("Solicitud no encontrada");
		}

		return NextResponse.json(request, { status: 200 });
	} catch (error) {
		console.error("Error getting user request by id:", error);
		return jsonFromError(error, "Error interno del servidor");
	}
}
