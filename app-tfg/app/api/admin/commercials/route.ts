import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	badRequestError,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	buildAdminUpsertCommercialProfileInput,
	type AdminUpsertCommercialProfileBody,
} from "@/lib/contracts/commercial-profile";
import {
	listCommercials,
	upsertCommercialProfile,
} from "@/lib/typeorm/services/commercial/commercial";

// GET /api/admin/commercials
// Lista los perfiles comerciales disponibles para gestión y asignaciones administrativas.
export async function GET(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

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

// POST /api/admin/commercials
// Crea o actualiza el perfil operativo de un comercial desde administración.
export async function POST(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<AdminUpsertCommercialProfileBody>(request);

		if (!body.userId) {
			return badRequestError("userId es obligatorio");
		}

		const commercial = await upsertCommercialProfile(
			buildAdminUpsertCommercialProfileInput(body),
		);

		return NextResponse.json(commercial, { status: 200 });
	} catch (error) {
		console.error("[admin/commercials][POST] error:", error);
		return jsonFromError(error, "Error al guardar el perfil comercial");
	}
}
