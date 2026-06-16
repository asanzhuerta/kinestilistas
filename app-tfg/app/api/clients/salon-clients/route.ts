import { NextResponse } from "next/server";
import {
	buildCreateSalonClientInput,
	type CreateSalonClientBody,
} from "@/lib/contracts/salon";
import {
	enforceApiRateLimit,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	createSalonClientForClientUser,
	listSalonClientsForClientUser,
} from "@/lib/typeorm/services/salon/salon-client";

export async function GET(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const salonClients = await listSalonClientsForClientUser(user.id);
		return NextResponse.json(salonClients, { status: 200 });
	} catch (error) {
		console.error("[clients/salon-clients][GET] error:", error);
		return jsonFromError(error, "Error al obtener las fichas técnicas");
	}
}

export async function POST(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<CreateSalonClientBody>(request);
		const salonClient = await createSalonClientForClientUser(
			user.id,
			buildCreateSalonClientInput(body),
		);

		return NextResponse.json(salonClient, { status: 201 });
	} catch (error) {
		console.error("[clients/salon-clients][POST] error:", error);
		return jsonFromError(error, "Error al crear la ficha técnica");
	}
}
