import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
	createCommercialVisit,
	CreateCommercialVisitError,
	listCommercialVisitsByCommercial,
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

type CreateCommercialVisitBody = {
	clientId?: string;
	scheduledForDate?: string;
	visitTypeId?: number;
	notes?: string | null;
};

export async function GET(request: Request) {
	try {
		const session = (await auth()) as SessionLike;

		if (!session?.user || session.user.role !== "commercial") {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const commercial = await requireCommercialByUserId(session.user.id);
		const { searchParams } = new URL(request.url);

		const clientId = searchParams.get("clientId");
		const statusId = searchParams.get("statusId");
		const visitTypeId = searchParams.get("visitTypeId");
		const dateFrom = searchParams.get("dateFrom");
		const dateTo = searchParams.get("dateTo");

		const visits = await listCommercialVisitsByCommercial({
			commercialId: commercial.id,
			clientId: clientId || null,
			statusId: statusId ? Number(statusId) : null,
			visitTypeId: visitTypeId ? Number(visitTypeId) : null,
			dateFrom: dateFrom || null,
			dateTo: dateTo || null,
		});

		return NextResponse.json(visits, { status: 200 });
	} catch (error) {
		console.error("[commercial/visits][GET] error:", error);

		if (error instanceof CommercialProfileError) {
			return NextResponse.json(
				{ error: error.message, code: error.code },
				{ status: error.status },
			);
		}

		return NextResponse.json(
			{ error: "Error al obtener las visitas del comercial" },
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	try {
		const session = (await auth()) as SessionLike;

		if (!session?.user || session.user.role !== "commercial") {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const commercial = await requireCommercialByUserId(session.user.id);
		const body = (await request.json()) as CreateCommercialVisitBody;

		if (!body.clientId || !body.scheduledForDate || !body.visitTypeId) {
			return NextResponse.json(
				{
					error: "clientId, scheduledForDate y visitTypeId son obligatorios",
				},
				{ status: 400 },
			);
		}

		const visit = await createCommercialVisit({
			clientId: String(body.clientId),
			commercialId: commercial.id,
			scheduledForDate: String(body.scheduledForDate),
			visitTypeId: Number(body.visitTypeId),
			notes: body.notes ?? null,
		});

		return NextResponse.json(visit, { status: 201 });
	} catch (error) {
		console.error("[commercial/visits][POST] error:", error);

		if (error instanceof CommercialProfileError) {
			return NextResponse.json(
				{ error: error.message, code: error.code },
				{ status: error.status },
			);
		}

		if (error instanceof CreateCommercialVisitError) {
			return NextResponse.json(
				{ error: error.message, code: error.code },
				{ status: error.status },
			);
		}

		return NextResponse.json(
			{ error: "Error al crear la visita" },
			{ status: 500 },
		);
	}
}
