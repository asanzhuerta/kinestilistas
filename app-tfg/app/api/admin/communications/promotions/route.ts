import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	getRequestSearchParams,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { AdminUpsertPromotionBody } from "@/lib/contracts/communications";
import { buildAdminUpsertPromotionInput } from "@/lib/contracts/communications";
import {
	createPromotion,
	listAdminPromotions,
} from "@/lib/typeorm/services/communications/communications";

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
		const promotions = await listAdminPromotions({
			search: searchParams.get("search"),
		});

		return NextResponse.json(promotions, { status: 200 });
	} catch (error) {
		console.error("[admin/communications/promotions][GET] error:", error);
		return jsonFromError(error, "Error al listar promociones");
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
		const body = await readJsonBody<AdminUpsertPromotionBody>(request);
		const promotion = await createPromotion({
			...buildAdminUpsertPromotionInput(body),
			createdByUserId: user.id,
		});

		return NextResponse.json(promotion, { status: 201 });
	} catch (error) {
		console.error("[admin/communications/promotions][POST] error:", error);
		return jsonFromError(error, "Error al crear promoción");
	}
}
