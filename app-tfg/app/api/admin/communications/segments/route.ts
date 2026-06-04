import { NextResponse } from "next/server";
import {
	getRequestSearchParams,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { AdminUpsertCustomerSegmentBody } from "@/lib/contracts/communications";
import { buildAdminUpsertCustomerSegmentInput } from "@/lib/contracts/communications";
import {
	createCustomerSegment,
	listCustomerSegments,
} from "@/lib/typeorm/services/communications/communications";

export async function GET(request: Request) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const searchParams = getRequestSearchParams(request);
		const segments = await listCustomerSegments({
			search: searchParams.get("search"),
		});

		return NextResponse.json(segments, { status: 200 });
	} catch (error) {
		console.error("[admin/communications/segments][GET] error:", error);
		return jsonFromError(error, "Error al listar segmentos");
	}
}

export async function POST(request: Request) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<AdminUpsertCustomerSegmentBody>(request);
		const segment = await createCustomerSegment(
			buildAdminUpsertCustomerSegmentInput(body),
		);

		return NextResponse.json(segment, { status: 201 });
	} catch (error) {
		console.error("[admin/communications/segments][POST] error:", error);
		return jsonFromError(error, "Error al crear segmento");
	}
}
