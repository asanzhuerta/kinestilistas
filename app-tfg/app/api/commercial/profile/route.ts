import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
	CommercialProfileError,
	requireCommercialByUserId,
	upsertCommercialProfile,
} from "@/lib/typeorm/services/commercial/commercial";

type SessionLike = {
	user?: {
		id: string;
		role: string;
	};
} | null;

type UpdateCommercialProfileBody = {
	workdayStartTime?: string | null;
	workdayEndTime?: string | null;
	deliveryVisitDurationMinutes?: number | string | null;
	routineVisitDurationMinutes?: number | string | null;
	routeStartAddress?: string | null;
	routeEndAddress?: string | null;
	returnToStart?: boolean;
	routeStartLat?: number | string | null;
	routeStartLng?: number | string | null;
	routeEndLat?: number | string | null;
	routeEndLng?: number | string | null;
};

export async function GET() {
	try {
		const session = (await auth()) as SessionLike;

		if (!session?.user || session.user.role !== "commercial") {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const commercial = await requireCommercialByUserId(session.user.id);

		return NextResponse.json(commercial, { status: 200 });
	} catch (error) {
		console.error("[commercial/profile][GET] error:", error);

		if (error instanceof CommercialProfileError) {
			return NextResponse.json(
				{ error: error.message, code: error.code },
				{ status: error.status },
			);
		}

		return NextResponse.json(
			{ error: "Error al obtener la configuración comercial" },
			{ status: 500 },
		);
	}
}

export async function PATCH(request: Request) {
	try {
		const session = (await auth()) as SessionLike;

		if (!session?.user || session.user.role !== "commercial") {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const body = (await request.json()) as UpdateCommercialProfileBody;

		const commercial = await upsertCommercialProfile({
			userId: session.user.id,
			workdayStartTime: body.workdayStartTime,
			workdayEndTime: body.workdayEndTime,
			deliveryVisitDurationMinutes: body.deliveryVisitDurationMinutes,
			routineVisitDurationMinutes: body.routineVisitDurationMinutes,
			routeStartAddress: body.routeStartAddress,
			routeEndAddress: body.routeEndAddress,
			returnToStart: body.returnToStart,
			routeStartLat: body.routeStartLat,
			routeStartLng: body.routeStartLng,
			routeEndLat: body.routeEndLat,
			routeEndLng: body.routeEndLng,
		});

		return NextResponse.json(commercial, { status: 200 });
	} catch (error) {
		console.error("[commercial/profile][PATCH] error:", error);

		if (error instanceof CommercialProfileError) {
			return NextResponse.json(
				{ error: error.message, code: error.code },
				{ status: error.status },
			);
		}

		return NextResponse.json(
			{ error: "Error al actualizar la configuración comercial" },
			{ status: 500 },
		);
	}
}
