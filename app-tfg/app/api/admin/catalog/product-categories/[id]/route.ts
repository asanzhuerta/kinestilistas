import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import type { AdminUpsertProductCategoryBody } from "@/lib/contracts/product-catalog";
import {
	buildAdminUpsertProductCategoryInput,
} from "@/lib/contracts/product-catalog";
import {
	enforceApiRateLimit,
	jsonFromError,
	notFoundError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	getProductCategoryById,
	updateProductCategory,
} from "@/lib/typeorm/services/catalog/product-category";

export async function GET(request: Request, context: RouteContext) {
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
		const productCategory = await getProductCategoryById(id);

		if (!productCategory) {
			return notFoundError("Categoría no encontrada", "PRODUCT_CATEGORY_NOT_FOUND");
		}

		return NextResponse.json(productCategory, { status: 200 });
	} catch (error) {
		console.error("[admin/catalog/product-categories/[id]][GET] error:", error);
		return jsonFromError(error, "Error al obtener la categoría");
	}
}

export async function PATCH(request: Request, context: RouteContext) {
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
		const body = await readJsonBody<AdminUpsertProductCategoryBody>(request);
		const updatedCategory = await updateProductCategory({
			categoryId: id,
			...buildAdminUpsertProductCategoryInput(body),
		});

		return NextResponse.json(updatedCategory, { status: 200 });
	} catch (error) {
		console.error(
			"[admin/catalog/product-categories/[id]][PATCH] error:",
			error,
		);
		return jsonFromError(error, "Error al actualizar la categoría");
	}
}
