import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import type { UpdateCommercialVisitBody } from "@/lib/contracts/commercial-visit";
import {
	enforceApiRateLimit,
	jsonFromError,
	notFoundError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	getCommercialVisitById,
	getCommercialVisitDetailById,
	updateCommercialVisit,
} from "@/lib/typeorm/services/commercial/commercial-visit";

// GET /api/admin/commercial-visits/[id]
// Obtiene el detalle de una visita comercial concreta desde el panel de administración.
export async function GET(request: Request, context: RouteContext) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const [user, { id }] = await Promise.all([
		requireRoleUser("admin"),
		context.params,
	]);

	if (!user) {
		return unauthorizedError();
	}

	try {
		const visit = await getCommercialVisitDetailById(id);

		if (!visit) {
			return notFoundError("Visita no encontrada");
		}

		return NextResponse.json(visit, { status: 200 });
	} catch (error) {
		console.error("[admin/commercial-visits/[id]][GET] error:", error);
		return jsonFromError(error, "Error al obtener la visita comercial");
	}
}

// PATCH /api/admin/commercial-visits/[id]
// Actualiza una visita comercial concreta desde administración.
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
		const [{ id }, body] = await Promise.all([
			context.params,
			readJsonBody<UpdateCommercialVisitBody>(request),
		]);
		const existingVisit = await getCommercialVisitById(id);

		if (!existingVisit) {
			return notFoundError("Visita no encontrada");
		}

		const updatedVisit = await updateCommercialVisit({
			visitId: id,
			commercialId: existingVisit.commercial_id,
			deliveredOrderQrs: body.deliveredOrderQrs,
			scheduledForDate:
				body.scheduledForDate !== undefined
					? String(body.scheduledForDate)
					: undefined,
			visitTypeId:
				body.visitTypeId !== undefined ? Number(body.visitTypeId) : undefined,
			statusId: body.statusId !== undefined ? Number(body.statusId) : undefined,
			notes: body.notes,
			result: body.result,
			orderIds: body.orderIds,
		});

		return NextResponse.json(updatedVisit, { status: 200 });
	} catch (error) {
		console.error("[admin/commercial-visits/[id]][PATCH] error:", error);
		return jsonFromError(error, "Error al actualizar la visita comercial");
	}
}
