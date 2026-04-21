import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
	createCommercialVisit,
	CreateCommercialVisitError,
	listCommercialVisitsByClient,
} from "@/lib/typeorm/services/commercial/commercial-visit";

type CreateCommercialVisitBody = {
	clientId?: string;
	commercialId?: string;
	scheduledForDate?: string;
	visitTypeId?: number;
	notes?: string | null;
};

// GET /api/admin/commercial-visits?clientId=...
export async function GET(request: Request) {
	try {
		const session = await auth();

		if (!session || session.user.role !== "admin") {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const clientId = String(searchParams.get("clientId") ?? "");

		if (!clientId) {
			return NextResponse.json(
				{ error: "El parámetro clientId es obligatorio" },
				{ status: 400 },
			);
		}

		const visits = await listCommercialVisitsByClient(clientId);

		return NextResponse.json(visits, { status: 200 });
	} catch (error) {
		console.error("[admin/commercial-visits][GET] error:", error);

		return NextResponse.json(
			{ error: "Error al listar las visitas comerciales" },
			{ status: 500 },
		);
	}
}

// POST /api/admin/commercial-visits
export async function POST(request: Request) {
	try {
		const session = await auth();

		if (!session || session.user.role !== "admin") {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const body = (await request.json()) as CreateCommercialVisitBody;

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

		if (error instanceof CreateCommercialVisitError) {
			return NextResponse.json(
				{ error: error.message, code: error.code },
				{ status: error.status },
			);
		}

		return NextResponse.json(
			{ error: "Error al crear la visita comercial" },
			{ status: 500 },
		);
	}
}
