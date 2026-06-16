import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	enforceApiRateLimit,
	jsonFromError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import { removeClientSegmentAssignment } from "@/lib/typeorm/services/communications/communications";

export async function DELETE(request: Request, context: RouteContext) {
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
		const deleted = await removeClientSegmentAssignment(id);

		return NextResponse.json(deleted, { status: 200 });
	} catch (error) {
		console.error("[admin/communications/client-segments/[id]][DELETE] error:", error);
		return jsonFromError(error, "Error al quitar asignación");
	}
}
