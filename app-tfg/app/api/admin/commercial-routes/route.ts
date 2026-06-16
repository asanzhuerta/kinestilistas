import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	badRequestError,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	buildCreateCommercialRouteInput,
	type CreateCommercialRouteBody,
} from "@/lib/contracts/commercial-route";
import { createCommercialRoute } from "@/lib/typeorm/services/commercial/commercial-route";

// POST /api/admin/commercial-routes
// Crea una nueva ruta comercial persistida para un comercial y una fecha concretos.
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
		const body = await readJsonBody<CreateCommercialRouteBody>(request);

		if (!body.commercialId || !body.date || !body.name) {
			return badRequestError("commercialId, date y name son obligatorios");
		}

		const createdRoute = await createCommercialRoute(
			buildCreateCommercialRouteInput(body),
		);

		return NextResponse.json(
			{
				message: "Ruta comercial creada correctamente",
				routeId: createdRoute.id,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("[admin/commercial-routes][POST] error:", error);
		return jsonFromError(error, "Error al crear la ruta comercial");
	}
}
