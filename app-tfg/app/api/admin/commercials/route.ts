import { NextResponse } from "next/server";
import {
	badRequestError,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	listCommercials,
	upsertCommercialProfile,
} from "@/lib/typeorm/services/commercial/commercial";

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

export async function GET() {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const commercials = await listCommercials();
		return NextResponse.json(commercials, { status: 200 });
	} catch (error) {
		console.error("[admin/commercials][GET] error:", error);
		return jsonFromError(error, "Error al obtener los perfiles comerciales");
	}
}

export async function POST(request: Request) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<UpsertCommercialBody>(request);

		if (!body.userId) {
			return badRequestError("userId es obligatorio");
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
		return jsonFromError(error, "Error al guardar el perfil comercial");
	}
}
