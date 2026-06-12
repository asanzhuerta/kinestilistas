import { NextResponse } from "next/server";
import {
	badRequestError,
	getOptionalNumberParam,
	getRequestSearchParams,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { CreateCommercialVisitBody } from "@/lib/contracts/commercial-visit";
import {
	createCommercialVisit,
	listCommercialVisitsByCommercial,
} from "@/lib/typeorm/services/commercial/commercial-visit";
import { requireCommercialByUserId } from "@/lib/typeorm/services/commercial/commercial";

// GET /api/commercial/visits?clientId=&statusId=&visitTypeId=&dateFrom=&dateTo=
// Lista las visitas del comercial autenticado aplicando filtros opcionales de cliente, estado, tipo y fechas.
export async function GET(request: Request) {
	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const commercial = await requireCommercialByUserId(user.id);
		const searchParams = getRequestSearchParams(request);
		const clientId = searchParams.get("clientId");
		const dateFrom = searchParams.get("dateFrom");
		const dateTo = searchParams.get("dateTo");

		const visits = await listCommercialVisitsByCommercial({
			commercialId: commercial.id,
			clientId: clientId || null,
			statusId: getOptionalNumberParam(searchParams, "statusId"),
			visitTypeId: getOptionalNumberParam(searchParams, "visitTypeId"),
			dateFrom: dateFrom || null,
			dateTo: dateTo || null,
		});

		return NextResponse.json(visits, { status: 200 });
	} catch (error) {
		console.error("[commercial/visits][GET] error:", error);
		return jsonFromError(error, "Error al obtener las visitas del comercial");
	}
}

// POST /api/commercial/visits
// Crea una nueva visita comercial en la agenda del comercial autenticado.
export async function POST(request: Request) {
	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const commercial = await requireCommercialByUserId(user.id);
		const body = await readJsonBody<CreateCommercialVisitBody>(request);

		if (!body.clientId || !body.scheduledForDate || !body.visitTypeId) {
			return badRequestError(
				"clientId, scheduledForDate y visitTypeId son obligatorios",
			);
		}

		const visit = await createCommercialVisit({
			clientId: String(body.clientId),
			commercialId: commercial.id,
			scheduledForDate: String(body.scheduledForDate),
			visitTypeId: Number(body.visitTypeId),
			notes: body.notes ?? null,
			orderIds: Array.isArray(body.orderIds) ? body.orderIds : [],
			deliveryIds: Array.isArray(body.deliveryIds) ? body.deliveryIds : [],
		});

		return NextResponse.json(visit, { status: 201 });
	} catch (error) {
		console.error("[commercial/visits][POST] error:", error);
		return jsonFromError(error, "Error al crear la visita");
	}
}
