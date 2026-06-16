import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	getRequestSearchParams,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { AdminUpsertProductCategoryBody } from "@/lib/contracts/product-catalog";
import {
	buildAdminUpsertProductCategoryInput,
} from "@/lib/contracts/product-catalog";
import {
	createProductCategory,
	listProductCategories,
} from "@/lib/typeorm/services/catalog/product-category";

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
		const productCategories = await listProductCategories({
			search: searchParams.get("search"),
		});

		return NextResponse.json(productCategories, { status: 200 });
	} catch (error) {
		console.error("[admin/catalog/product-categories][GET] error:", error);
		return jsonFromError(error, "Error al listar las categorías");
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
		const body = await readJsonBody<AdminUpsertProductCategoryBody>(request);
		const createdCategory = await createProductCategory(
			buildAdminUpsertProductCategoryInput(body),
		);

		return NextResponse.json(createdCategory, { status: 201 });
	} catch (error) {
		console.error("[admin/catalog/product-categories][POST] error:", error);
		return jsonFromError(error, "Error al crear la categoría");
	}
}
