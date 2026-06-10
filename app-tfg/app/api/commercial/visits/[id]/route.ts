import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import type { UpdateCommercialVisitBody } from "@/lib/contracts/commercial-visit";
import {
	jsonFromError,
	notFoundError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	getCommercialVisitDetailByIdForCommercial,
	updateCommercialVisit,
} from "@/lib/typeorm/services/commercial/commercial-visit";
import { requireCommercialByUserId } from "@/lib/typeorm/services/commercial/commercial";

// GET /api/commercial/visits/[id]
// Obtiene el detalle de una visita concreta perteneciente al comercial autenticado.
export async function GET(_: Request, context: RouteContext) {
	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const commercial = await requireCommercialByUserId(user.id);
		const { id } = await context.params;
		const visit = await getCommercialVisitDetailByIdForCommercial(id, commercial.id);

		if (!visit) {
			return notFoundError("Visita no encontrada");
		}

		return NextResponse.json(visit, { status: 200 });
	} catch (error) {
		console.error("[commercial/visits/[id]][GET] error:", error);
		return jsonFromError(error, "Error al obtener la visita");
	}
}

// PATCH /api/commercial/visits/[id]
// Actualiza el estado o los datos editables de una visita concreta del comercial autenticado.
export async function PATCH(request: Request, context: RouteContext) {
	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const commercial = await requireCommercialByUserId(user.id);
		const { id } = await context.params;
		const body = await readJsonBody<UpdateCommercialVisitBody>(request);

		const visit = await updateCommercialVisit({
			visitId: id,
			commercialId: commercial.id,
			deliveredOrderQrs: body.deliveredOrderQrs,
			scannedOrderQr: body.scannedOrderQr,
			scheduledForDate: body.scheduledForDate,
			visitTypeId: body.visitTypeId,
			statusId: body.statusId,
			notes: body.notes,
			result: body.result,
			orderIds: body.orderIds,
		});

		return NextResponse.json(visit, { status: 200 });
	} catch (error) {
		console.error("[commercial/visits/[id]][PATCH] error:", error);
		return jsonFromError(error, "Error al actualizar la visita");
	}
}
