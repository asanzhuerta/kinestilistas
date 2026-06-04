import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	jsonFromError,
	notFoundError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { AdminUpsertPromotionBody } from "@/lib/contracts/communications";
import { buildAdminUpsertPromotionInput } from "@/lib/contracts/communications";
import {
	deletePromotion,
	getPromotionById,
	updatePromotion,
} from "@/lib/typeorm/services/communications/communications";

export async function GET(_: Request, context: RouteContext) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const promotion = await getPromotionById(id);

		if (!promotion) {
			return notFoundError("Promocion no encontrada", "PROMOTION_NOT_FOUND");
		}

		return NextResponse.json(promotion, { status: 200 });
	} catch (error) {
		console.error("[admin/communications/promotions/[id]][GET] error:", error);
		return jsonFromError(error, "Error al obtener promocion");
	}
}

export async function PATCH(request: Request, context: RouteContext) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const body = await readJsonBody<AdminUpsertPromotionBody>(request);
		const promotion = await updatePromotion({
			promotionId: id,
			...buildAdminUpsertPromotionInput(body),
		});

		return NextResponse.json(promotion, { status: 200 });
	} catch (error) {
		console.error("[admin/communications/promotions/[id]][PATCH] error:", error);
		return jsonFromError(error, "Error al actualizar promocion");
	}
}

export async function DELETE(_: Request, context: RouteContext) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const deleted = await deletePromotion(id);

		return NextResponse.json(deleted, { status: 200 });
	} catch (error) {
		console.error("[admin/communications/promotions/[id]][DELETE] error:", error);
		return jsonFromError(error, "Error al eliminar promocion");
	}
}
