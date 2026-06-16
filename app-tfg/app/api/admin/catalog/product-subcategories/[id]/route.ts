import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import type { AdminUpsertProductSubcategoryBody } from "@/lib/contracts/product-catalog";
import { buildAdminUpsertProductSubcategoryInput } from "@/lib/contracts/product-catalog";
import {
	enforceApiRateLimit,
	jsonFromError,
	notFoundError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	getProductSubcategoryById,
	updateProductSubcategory,
} from "@/lib/typeorm/services/catalog/product-subcategory";

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
		const productSubcategory = await getProductSubcategoryById(id);

		if (!productSubcategory) {
			return notFoundError(
				"Subcategoría no encontrada",
				"PRODUCT_SUBCATEGORY_NOT_FOUND",
			);
		}

		return NextResponse.json(productSubcategory, { status: 200 });
	} catch (error) {
		console.error("[admin/catalog/product-subcategories/[id]][GET] error:", error);
		return jsonFromError(error, "Error al obtener la subcategoría");
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
		const body = await readJsonBody<AdminUpsertProductSubcategoryBody>(request);
		const updatedProductSubcategory = await updateProductSubcategory({
			productSubcategoryId: id,
			...buildAdminUpsertProductSubcategoryInput(body),
		});

		return NextResponse.json(updatedProductSubcategory, { status: 200 });
	} catch (error) {
		console.error(
			"[admin/catalog/product-subcategories/[id]][PATCH] error:",
			error,
		);
		return jsonFromError(error, "Error al actualizar la subcategoría");
	}
}
