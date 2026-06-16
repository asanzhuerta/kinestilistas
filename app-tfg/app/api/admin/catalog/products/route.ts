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
import type { AdminUpsertProductBody } from "@/lib/contracts/product-catalog";
import { buildAdminUpsertProductInput } from "@/lib/contracts/product-catalog";
import {
	createProduct,
	listProducts,
} from "@/lib/typeorm/services/catalog/product";

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
		const products = await listProducts({
			search: searchParams.get("search"),
			productCategoryId: searchParams.get("productCategoryId"),
			productLineId: searchParams.get("productLineId"),
			productSubcategoryId: searchParams.get("productSubcategoryId"),
			statusId: getOptionalNumberParam(searchParams, "statusId"),
		});

		return NextResponse.json(products, { status: 200 });
	} catch (error) {
		console.error("[admin/catalog/products][GET] error:", error);
		return jsonFromError(error, "Error al listar los productos");
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
		const body = await readJsonBody<AdminUpsertProductBody>(request);
		const createdProduct = await createProduct(buildAdminUpsertProductInput(body));

		return NextResponse.json(createdProduct, { status: 201 });
	} catch (error) {
		console.error("[admin/catalog/products][POST] error:", error);
		return jsonFromError(error, "Error al crear el producto");
	}
}
