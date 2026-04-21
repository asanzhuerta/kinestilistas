import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
	CommercialProfileError,
	listCommercials,
	upsertCommercialProfile,
} from "@/lib/typeorm/services/commercial/commercial";

type SessionUser = {
	id: string;
	role: string;
};

type SessionLike = {
	user?: SessionUser;
} | null;

type AdminSession = {
	user: SessionUser & {
		role: "admin";
	};
};

type UpsertCommercialBody = {
	userId?: string;
	employeeCode?: string | null;
	territory?: string | null;
	notes?: string | null;
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

function isAdmin(session: SessionLike): session is AdminSession {
	return session?.user?.role === "admin";
}

export async function GET() {
	try {
		const session = (await auth()) as SessionLike;

		if (!isAdmin(session)) {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const commercials = await listCommercials();

		return NextResponse.json(commercials, { status: 200 });
	} catch (error) {
		console.error("[admin/commercials][GET] error:", error);

		return NextResponse.json(
			{ error: "Error al obtener los perfiles comerciales" },
			{ status: 500 },
		);
	}
}

export async function POST(request: Request) {
	try {
		const session = (await auth()) as SessionLike;

		if (!isAdmin(session)) {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const body = (await request.json()) as UpsertCommercialBody;

		if (!body.userId) {
			return NextResponse.json(
				{ error: "userId es obligatorio" },
				{ status: 400 },
			);
		}

		const commercial = await upsertCommercialProfile({
			userId: String(body.userId ?? ""),
			employeeCode: body.employeeCode,
			territory: body.territory,
			notes: body.notes,
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
		console.error("[admin/commercials][POST] error:", error);

		if (error instanceof CommercialProfileError) {
			return NextResponse.json(
				{ error: error.message, code: error.code },
				{ status: error.status },
			);
		}

		return NextResponse.json(
			{ error: "Error al guardar el perfil comercial" },
			{ status: 500 },
		);
	}
}
