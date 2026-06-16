import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	getOptionalNumberParam,
	getRequestSearchParams,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { AdminUpsertSupportResourceBody } from "@/lib/contracts/product-catalog";
import {
	buildAdminUpsertSupportResourceInput,
} from "@/lib/contracts/product-catalog";
import {
	createSupportResource,
	listSupportResources,
} from "@/lib/typeorm/services/catalog/support-resource";

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
		const supportResources = await listSupportResources({
			search: searchParams.get("search"),
			resourceTypeId: getOptionalNumberParam(searchParams, "resourceTypeId"),
			productId: searchParams.get("productId"),
			productLineId: searchParams.get("productLineId"),
		});

		return NextResponse.json(supportResources, { status: 200 });
	} catch (error) {
		console.error("[admin/catalog/support-resources][GET] error:", error);
		return jsonFromError(error, "Error al listar los recursos de apoyo");
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
		const body = await readJsonBody<AdminUpsertSupportResourceBody>(request);
		const createdSupportResource = await createSupportResource(
			buildAdminUpsertSupportResourceInput(body),
		);

		return NextResponse.json(createdSupportResource, { status: 201 });
	} catch (error) {
		console.error("[admin/catalog/support-resources][POST] error:", error);
		return jsonFromError(error, "Error al crear el recurso de apoyo");
	}
}
