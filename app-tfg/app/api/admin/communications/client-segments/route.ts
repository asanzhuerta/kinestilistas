import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	getRequestSearchParams,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { AdminAssignClientSegmentBody } from "@/lib/contracts/communications";
import { buildAdminAssignClientSegmentInput } from "@/lib/contracts/communications";
import {
	assignClientToSegment,
	listClientSegmentAssignments,
} from "@/lib/typeorm/services/communications/communications";

export async function GET(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const searchParams = getRequestSearchParams(request);
		const assignments = await listClientSegmentAssignments({
			search: searchParams.get("search"),
		});

		return NextResponse.json(assignments, { status: 200 });
	} catch (error) {
		console.error("[admin/communications/client-segments][GET] error:", error);
		return jsonFromError(error, "Error al listar asignaciones");
	}
}

export async function POST(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<AdminAssignClientSegmentBody>(request);
		const assignment = await assignClientToSegment({
			...buildAdminAssignClientSegmentInput(body),
			assignedByUserId: user.id,
		});

		return NextResponse.json(assignment, { status: 201 });
	} catch (error) {
		console.error("[admin/communications/client-segments][POST] error:", error);
		return jsonFromError(error, "Error al asignar rango");
	}
}
