import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	forbiddenError,
	getSessionUser,
	jsonFromError,
	readJsonBody,
	unauthorizedError,
} from "@/lib/api/server";
import { approveUserRequest } from "@/lib/typeorm/services/users/request";

type ApproveUserRequestBody = {
	commercialId?: string | null;
};

export async function POST(request: Request, context: RouteContext) {
	const user = await getSessionUser();

	if (!user) {
		return unauthorizedError("No autenticado");
	}

	if (user.role !== "admin") {
		return forbiddenError();
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
