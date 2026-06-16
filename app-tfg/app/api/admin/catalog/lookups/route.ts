import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	jsonFromError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	listProductStatuses,
	listSupportResourceTypes,
} from "@/lib/typeorm/services/catalog/lookups";

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
		const [productStatuses, supportResourceTypes] = await Promise.all([
			listProductStatuses(),
			listSupportResourceTypes(),
		]);

		return NextResponse.json(
			{
				productStatuses,
				supportResourceTypes,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("[admin/catalog/lookups][GET] error:", error);
		return jsonFromError(error, "Error al cargar los catálogos de apoyo");
	}
}
