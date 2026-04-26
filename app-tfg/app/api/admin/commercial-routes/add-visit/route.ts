import { NextResponse } from "next/server";
import {
	badRequestError,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import { addVisitToRoute } from "@/lib/typeorm/services/commercial/commercial-route";

type AddVisitToRouteBody = {
	routeId?: string;
	visitId?: string;
	order?: number;
};

export async function POST(request: Request) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<AddVisitToRouteBody>(request);

		if (!body.routeId || !body.visitId || body.order === undefined) {
			return badRequestError("routeId, visitId y order son obligatorios");
		}

		const createdRouteVisit = await addVisitToRoute({
			routeId: String(body.routeId),
			visitId: String(body.visitId),
			order: Number(body.order),
		});

		return NextResponse.json(
			{
				message: "Visita anadida a la ruta correctamente",
				routeVisitId: createdRouteVisit.id,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("[admin/commercial-routes/add-visit][POST] error:", error);
		return jsonFromError(error, "Error al anadir la visita a la ruta");
	}
}
