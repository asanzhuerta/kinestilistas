import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	getRequestSearchParams,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { AdminUpsertColorReferenceBody } from "@/lib/contracts/product-catalog";
import {
	buildAdminUpsertColorReferenceInput,
} from "@/lib/contracts/product-catalog";
import {
	createColorReference,
	listColorReferences,
} from "@/lib/typeorm/services/catalog/color-chart";

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
		const colorReferences = await listColorReferences({
			colorChartId: searchParams.get("colorChartId"),
			search: searchParams.get("search"),
		});

		return NextResponse.json(colorReferences, { status: 200 });
	} catch (error) {
		console.error("[admin/catalog/color-references][GET] error:", error);
		return jsonFromError(error, "Error al listar las referencias de color");
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
		const body = await readJsonBody<AdminUpsertColorReferenceBody>(request);
		const createdColorReference = await createColorReference(
			buildAdminUpsertColorReferenceInput(body),
		);

		return NextResponse.json(createdColorReference, { status: 201 });
	} catch (error) {
		console.error("[admin/catalog/color-references][POST] error:", error);
		return jsonFromError(error, "Error al crear la referencia de color");
	}
}
