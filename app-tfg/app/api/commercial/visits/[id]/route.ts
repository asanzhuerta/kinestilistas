import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
	getCommercialVisitByIdForCommercial,
	updateCommercialVisit,
	UpdateCommercialVisitError,
} from "@/lib/typeorm/services/commercial/commercial-visit";
import {
	CommercialProfileError,
	requireCommercialByUserId,
} from "@/lib/typeorm/services/commercial/commercial";

type SessionLike = {
	user?: {
		id: string;
		role: string;
	};
} | null;

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

export async function GET(_: Request, context: RouteContext) {
	try {
		const session = (await auth()) as SessionLike;

		if (!session?.user || session.user.role !== "commercial") {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const commercial = await requireCommercialByUserId(session.user.id);
		const { id } = await context.params;

		const visit = await getCommercialVisitByIdForCommercial(id, commercial.id);

		if (!visit) {
			return NextResponse.json(
				{ error: "Visita no encontrada" },
				{ status: 404 },
			);
		}

		return NextResponse.json(visit, { status: 200 });
	} catch (error) {
		console.error("[commercial/visits/[id]][GET] error:", error);

		if (error instanceof CommercialProfileError) {
			return NextResponse.json(
				{ error: error.message, code: error.code },
				{ status: error.status },
			);
		}

		return NextResponse.json(
			{ error: "Error al obtener la visita" },
			{ status: 500 },
		);
	}
}

export async function PATCH(request: Request, context: RouteContext) {
	try {
		const session = (await auth()) as SessionLike;

		if (!session?.user || session.user.role !== "commercial") {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const commercial = await requireCommercialByUserId(session.user.id);
		const { id } = await context.params;
		const body = (await request.json()) as UpdateCommercialVisitBody;

		const visit = await updateCommercialVisit({
			visitId: id,
			commercialId: commercial.id,
			scheduledForDate: body.scheduledForDate,
			visitTypeId: body.visitTypeId,
			statusId: body.statusId,
			notes: body.notes,
			result: body.result,
		});

		return NextResponse.json(visit, { status: 200 });
	} catch (error) {
		console.error("[commercial/visits/[id]][PATCH] error:", error);

		if (error instanceof CommercialProfileError) {
			return NextResponse.json(
				{ error: error.message, code: error.code },
				{ status: error.status },
			);
		}

		if (error instanceof UpdateCommercialVisitError) {
			return NextResponse.json(
				{ error: error.message, code: error.code },
				{ status: error.status },
			);
		}

		return NextResponse.json(
			{ error: "Error al actualizar la visita" },
			{ status: 500 },
		);
	}
}
