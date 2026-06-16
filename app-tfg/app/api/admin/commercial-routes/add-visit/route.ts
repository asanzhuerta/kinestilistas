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
	buildAddVisitToCommercialRouteInput,
	type AddVisitToCommercialRouteBody,
} from "@/lib/contracts/commercial-route";
import { addVisitToRoute } from "@/lib/typeorm/services/commercial/commercial-route";

// POST /api/admin/commercial-routes/add-visit
// Anade una visita existente a una ruta comercial persistida en la posicion indicada.
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
		const body = await readJsonBody<AddVisitToCommercialRouteBody>(request);

		if (!body.routeId || !body.visitId || body.order === undefined) {
			return badRequestError("routeId, visitId y order son obligatorios");
		}

		const createdRouteVisit = await addVisitToRoute(
			buildAddVisitToCommercialRouteInput(body),
		);

		return NextResponse.json(
			{
				message: "Visita anadida a la ruta correctamente",
				routeVisitId: createdRouteVisit.id,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("[admin/commercial-routes/add-visit][POST] error:", error);
		return jsonFromError(error, "Error al añadir la visita a la ruta");
	}
}
