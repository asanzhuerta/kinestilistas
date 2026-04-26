import { NextResponse } from "next/server";
import {
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { UpdateCommercialProfileBody } from "@/lib/contracts/commercial-profile";
import {
	requireCommercialByUserId,
	upsertCommercialProfile,
} from "@/lib/typeorm/services/commercial/commercial";

// GET /api/commercial/profile
// Obtiene la configuracion operativa del comercial autenticado.
export async function GET() {
	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const commercial = await requireCommercialByUserId(user.id);
		return NextResponse.json(commercial, { status: 200 });
	} catch (error) {
		console.error("[commercial/profile][GET] error:", error);
		return jsonFromError(error, "Error al obtener la configuracion comercial");
	}
}

// PATCH /api/commercial/profile
// Actualiza la configuracion de jornada, duraciones y puntos de ruta del comercial autenticado.
export async function PATCH(request: Request) {
	const user = await requireRoleUser("commercial");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<UpdateCommercialProfileBody>(request);
		const commercial = await upsertCommercialProfile({
			userId: user.id,
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
		return jsonFromError(error, "Error al actualizar la configuracion comercial");
	}
}
