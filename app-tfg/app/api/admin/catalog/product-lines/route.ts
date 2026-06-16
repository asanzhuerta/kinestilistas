import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	getRequestSearchParams,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { AdminUpsertProductLineBody } from "@/lib/contracts/product-catalog";
import {
	buildAdminUpsertProductLineInput,
} from "@/lib/contracts/product-catalog";
import {
	createProductLine,
	listProductLines,
} from "@/lib/typeorm/services/catalog/product-line";

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
		const productLines = await listProductLines({
			productCategoryId: searchParams.get("productCategoryId"),
			search: searchParams.get("search"),
		});

		return NextResponse.json(productLines, { status: 200 });
	} catch (error) {
		console.error("[admin/catalog/product-lines][GET] error:", error);
		return jsonFromError(error, "Error al listar las líneas comerciales");
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
		const body = await readJsonBody<AdminUpsertProductLineBody>(request);
		const createdProductLine = await createProductLine(
			buildAdminUpsertProductLineInput(body),
		);

		return NextResponse.json(createdProductLine, { status: 201 });
	} catch (error) {
		console.error("[admin/catalog/product-lines][POST] error:", error);
		return jsonFromError(error, "Error al crear la línea comercial");
	}
}
