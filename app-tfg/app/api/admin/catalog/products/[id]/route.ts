import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import type { AdminUpsertProductBody } from "@/lib/contracts/product-catalog";
import { buildAdminUpsertProductInput } from "@/lib/contracts/product-catalog";
import {
	enforceApiRateLimit,
	jsonFromError,
	notFoundError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	getProductById,
	updateProduct,
} from "@/lib/typeorm/services/catalog/product";

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
		const product = await getProductById(id);

		if (!product) {
			return notFoundError("Producto no encontrado", "PRODUCT_NOT_FOUND");
		}

		return NextResponse.json(product, { status: 200 });
	} catch (error) {
		console.error("[admin/catalog/products/[id]][GET] error:", error);
		return jsonFromError(error, "Error al obtener el producto");
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
		const body = await readJsonBody<AdminUpsertProductBody>(request);
		const updatedProduct = await updateProduct({
			productId: id,
			...buildAdminUpsertProductInput(body),
		});

		return NextResponse.json(updatedProduct, { status: 200 });
	} catch (error) {
		console.error("[admin/catalog/products/[id]][PATCH] error:", error);
		return jsonFromError(error, "Error al actualizar el producto");
	}
}
