import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	getRequestSearchParams,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { AdminUpsertProductSubcategoryBody } from "@/lib/contracts/product-catalog";
import { buildAdminUpsertProductSubcategoryInput } from "@/lib/contracts/product-catalog";
import {
	createProductSubcategory,
	listProductSubcategories,
} from "@/lib/typeorm/services/catalog/product-subcategory";

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
		const productSubcategories = await listProductSubcategories({
			search: searchParams.get("search"),
			productLineId: searchParams.get("productLineId"),
		});

		return NextResponse.json(productSubcategories, { status: 200 });
	} catch (error) {
		console.error("[admin/catalog/product-subcategories][GET] error:", error);
		return jsonFromError(error, "Error al listar las subcategorías");
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
		const body = await readJsonBody<AdminUpsertProductSubcategoryBody>(request);
		const createdProductSubcategory = await createProductSubcategory(
			buildAdminUpsertProductSubcategoryInput(body),
		);

		return NextResponse.json(createdProductSubcategory, { status: 201 });
	} catch (error) {
		console.error("[admin/catalog/product-subcategories][POST] error:", error);
		return jsonFromError(error, "Error al crear la subcategoría");
	}
}
