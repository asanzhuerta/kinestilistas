import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	getRequestSearchParams,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { AdminUpsertColorChartBody } from "@/lib/contracts/product-catalog";
import { buildAdminUpsertColorChartInput } from "@/lib/contracts/product-catalog";
import {
	createColorChart,
	listColorCharts,
} from "@/lib/typeorm/services/catalog/color-chart";

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
		const colorCharts = await listColorCharts({
			productLineId: searchParams.get("productLineId"),
			search: searchParams.get("search"),
		});

		return NextResponse.json(colorCharts, { status: 200 });
	} catch (error) {
		console.error("[admin/catalog/color-charts][GET] error:", error);
		return jsonFromError(error, "Error al listar las cartas de color");
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
		const body = await readJsonBody<AdminUpsertColorChartBody>(request);
		const createdColorChart = await createColorChart(
			buildAdminUpsertColorChartInput(body),
		);

		return NextResponse.json(createdColorChart, { status: 201 });
	} catch (error) {
		console.error("[admin/catalog/color-charts][POST] error:", error);
		return jsonFromError(error, "Error al crear la carta de color");
	}
}
