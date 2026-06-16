import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import type { AdminUpsertSupportResourceBody } from "@/lib/contracts/product-catalog";
import {
	buildAdminUpsertSupportResourceInput,
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
	getSupportResourceById,
	updateSupportResource,
} from "@/lib/typeorm/services/catalog/support-resource";

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
		const supportResource = await getSupportResourceById(id);

		if (!supportResource) {
			return notFoundError(
				"Recurso de apoyo no encontrado",
				"SUPPORT_RESOURCE_NOT_FOUND",
			);
		}

		return NextResponse.json(supportResource, { status: 200 });
	} catch (error) {
		console.error("[admin/catalog/support-resources/[id]][GET] error:", error);
		return jsonFromError(error, "Error al obtener el recurso de apoyo");
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
		const body = await readJsonBody<AdminUpsertSupportResourceBody>(request);
		const updatedSupportResource = await updateSupportResource({
			supportResourceId: id,
			...buildAdminUpsertSupportResourceInput(body),
		});

		return NextResponse.json(updatedSupportResource, { status: 200 });
	} catch (error) {
		console.error(
			"[admin/catalog/support-resources/[id]][PATCH] error:",
			error,
		);
		return jsonFromError(error, "Error al actualizar el recurso de apoyo");
	}
}
