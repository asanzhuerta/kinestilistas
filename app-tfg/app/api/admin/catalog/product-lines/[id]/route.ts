import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import type { AdminUpsertProductLineBody } from "@/lib/contracts/product-catalog";
import { buildAdminUpsertProductLineInput } from "@/lib/contracts/product-catalog";
import {
	enforceApiRateLimit,
	jsonFromError,
	notFoundError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	getProductLineById,
	updateProductLine,
} from "@/lib/typeorm/services/catalog/product-line";

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
		const productLine = await getProductLineById(id);

		if (!productLine) {
			return notFoundError("Línea comercial no encontrada", "PRODUCT_LINE_NOT_FOUND");
		}

		return NextResponse.json(productLine, { status: 200 });
	} catch (error) {
		console.error("[admin/catalog/product-lines/[id]][GET] error:", error);
		return jsonFromError(error, "Error al obtener la línea comercial");
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
		const body = await readJsonBody<AdminUpsertProductLineBody>(request);
		const updatedProductLine = await updateProductLine({
			productLineId: id,
			...buildAdminUpsertProductLineInput(body),
		});

		return NextResponse.json(updatedProductLine, { status: 200 });
	} catch (error) {
		console.error("[admin/catalog/product-lines/[id]][PATCH] error:", error);
		return jsonFromError(error, "Error al actualizar la línea comercial");
	}
}
