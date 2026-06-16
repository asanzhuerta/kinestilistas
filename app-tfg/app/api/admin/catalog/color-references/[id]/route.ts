import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import type { AdminUpsertColorReferenceBody } from "@/lib/contracts/product-catalog";
import {
	buildAdminUpsertColorReferenceInput,
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
	getColorReferenceById,
	updateColorReference,
} from "@/lib/typeorm/services/catalog/color-chart";

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
		const colorReference = await getColorReferenceById(id);

		if (!colorReference) {
			return notFoundError(
				"Referencia de color no encontrada",
				"COLOR_REFERENCE_NOT_FOUND",
			);
		}

		return NextResponse.json(colorReference, { status: 200 });
	} catch (error) {
		console.error("[admin/catalog/color-references/[id]][GET] error:", error);
		return jsonFromError(error, "Error al obtener la referencia de color");
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
		const body = await readJsonBody<AdminUpsertColorReferenceBody>(request);
		const updatedColorReference = await updateColorReference({
			colorReferenceId: id,
			...buildAdminUpsertColorReferenceInput(body),
		});

		return NextResponse.json(updatedColorReference, { status: 200 });
	} catch (error) {
		console.error("[admin/catalog/color-references/[id]][PATCH] error:", error);
		return jsonFromError(error, "Error al actualizar la referencia de color");
	}
}
