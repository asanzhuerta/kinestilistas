import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import type { AdminUpsertColorChartBody } from "@/lib/contracts/product-catalog";
import { buildAdminUpsertColorChartInput } from "@/lib/contracts/product-catalog";
import {
	enforceApiRateLimit,
	jsonFromError,
	notFoundError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	getColorChartById,
	updateColorChart,
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
		const colorChart = await getColorChartById(id);

		if (!colorChart) {
			return notFoundError("Carta de color no encontrada", "COLOR_CHART_NOT_FOUND");
		}

		return NextResponse.json(colorChart, { status: 200 });
	} catch (error) {
		console.error("[admin/catalog/color-charts/[id]][GET] error:", error);
		return jsonFromError(error, "Error al obtener la carta de color");
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
		const body = await readJsonBody<AdminUpsertColorChartBody>(request);
		const updatedColorChart = await updateColorChart({
			colorChartId: id,
			...buildAdminUpsertColorChartInput(body),
		});

		return NextResponse.json(updatedColorChart, { status: 200 });
	} catch (error) {
		console.error("[admin/catalog/color-charts/[id]][PATCH] error:", error);
		return jsonFromError(error, "Error al actualizar la carta de color");
	}
}
