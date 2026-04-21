import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
	getCommercialVisitById,
	updateCommercialVisit,
	UpdateCommercialVisitError,
} from "@/lib/typeorm/services/commercial/commercial-visit";

type RouteContext = {
	params: Promise<{
		id: string;
	}>;
};

type UpdateCommercialVisitBody = {
	scheduledForDate?: string;
	visitTypeId?: number;
	statusId?: number;
	notes?: string | null;
	result?: string | null;
};

// GET /api/admin/commercial-visits/[id]
export async function GET(_: Request, context: RouteContext) {
	try {
		const session = await auth();

		if (!session || session.user.role !== "admin") {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const { id } = await context.params;

		const visit = await getCommercialVisitById(id);

		if (!visit) {
			return NextResponse.json(
				{ error: "Visita no encontrada" },
				{ status: 404 },
			);
		}

		return NextResponse.json(visit, { status: 200 });
	} catch (error) {
		console.error("[admin/commercial-visits/[id]][GET] error:", error);

		return NextResponse.json(
			{ error: "Error al obtener la visita comercial" },
			{ status: 500 },
		);
	}
}

// PATCH /api/admin/commercial-visits/[id]
export async function PATCH(request: Request, context: RouteContext) {
	try {
		const session = await auth();

		if (!session || session.user.role !== "admin") {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const { id } = await context.params;
		const body = (await request.json()) as UpdateCommercialVisitBody;

		const existingVisit = await getCommercialVisitById(id);

		if (!existingVisit) {
			return NextResponse.json(
				{ error: "Visita no encontrada" },
				{ status: 404 },
			);
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

		if (error instanceof UpdateCommercialVisitError) {
			return NextResponse.json(
				{ error: error.message, code: error.code },
				{ status: error.status },
			);
		}

		return NextResponse.json(
			{ error: "Error al actualizar la visita comercial" },
			{ status: 500 },
		);
	}
}
