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
	getCommercialVisitById,
	updateCommercialVisit,
} from "@/lib/typeorm/services/commercial/commercial-visit";

export async function GET(_: Request, context: RouteContext) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const visit = await getCommercialVisitById(id);

		if (!visit) {
			return notFoundError("Visita no encontrada");
		}

		return NextResponse.json(visit, { status: 200 });
	} catch (error) {
		console.error("[admin/commercial-visits/[id]][GET] error:", error);
		return jsonFromError(error, "Error al obtener la visita comercial");
	}
}

export async function PATCH(request: Request, context: RouteContext) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const body = await readJsonBody<UpdateCommercialVisitBody>(request);
		const existingVisit = await getCommercialVisitById(id);

		if (!existingVisit) {
			return notFoundError("Visita no encontrada");
		}

		const updatedVisit = await updateCommercialVisit({
			visitId: id,
			commercialId: existingVisit.commercial_id,
			scheduledForDate:
				body.scheduledForDate !== undefined
					? String(body.scheduledForDate)
					: undefined,
			visitTypeId:
				body.visitTypeId !== undefined ? Number(body.visitTypeId) : undefined,
			statusId: body.statusId !== undefined ? Number(body.statusId) : undefined,
			notes: body.notes,
			result: body.result,
		});

		return NextResponse.json(updatedVisit, { status: 200 });
	} catch (error) {
		console.error("[admin/commercial-visits/[id]][PATCH] error:", error);
		return jsonFromError(error, "Error al actualizar la visita comercial");
	}
}
