import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	badRequestError,
	getRequestSearchParams,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { CreateCommercialVisitBody } from "@/lib/contracts/commercial-visit";
import {
	createCommercialVisit,
	listCommercialVisitsByClient,
} from "@/lib/typeorm/services/commercial/commercial-visit";

// GET /api/admin/commercial-visits?clientId=123
// Lista visitas comerciales de administración con filtros opcionales por cliente y metadatos relacionados.
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
		const clientId = String(searchParams.get("clientId") ?? "");

		if (!clientId) {
			return badRequestError("El parámetro clientId es obligatorio");
		}

		const visits = await listCommercialVisitsByClient(clientId);

		return NextResponse.json(visits, { status: 200 });
	} catch (error) {
		console.error("[admin/commercial-visits][GET] error:", error);
		return jsonFromError(error, "Error al listar las visitas comerciales");
	}
}

// POST /api/admin/commercial-visits
// Crea una visita comercial desde administración para el comercial y cliente indicados.
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
		const body = await readJsonBody<CreateCommercialVisitBody>(request);

		const createdVisit = await createCommercialVisit({
			clientId: String(body.clientId ?? ""),
			commercialId: String(body.commercialId ?? ""),
			scheduledForDate: String(body.scheduledForDate ?? ""),
			visitTypeId: Number(body.visitTypeId),
			notes: body.notes ?? null,
		});

		return NextResponse.json(
			{
				message: "Visita comercial creada correctamente",
				visitId: createdVisit.id,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("[admin/commercial-visits][POST] error:", error);
		return jsonFromError(error, "Error al crear la visita comercial");
	}
}
