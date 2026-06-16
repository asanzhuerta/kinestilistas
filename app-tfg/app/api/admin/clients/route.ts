import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	buildCreateClientInput,
	type CreateClientRequestBody,
} from "@/lib/contracts/client-write";
import {
	createClient,
	listClients,
} from "@/lib/typeorm/services/commercial/client";

// GET /api/admin/clients
// Lista todos los clientes del sistema para las pantallas de administración.
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
		const clients = await listClients();
		return NextResponse.json(clients, { status: 200 });
	} catch (error) {
		console.error("[admin/clients][GET] error:", error);
		return jsonFromError(error, "Error al listar los clientes");
	}
}

// POST /api/admin/clients
// Crea un nuevo cliente desde administración y devuelve la ficha creada.
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
		const body = await readJsonBody<CreateClientRequestBody>(request);
		const createdClient = await createClient(buildCreateClientInput(body));

		return NextResponse.json(
			{
				message: "Cliente creado correctamente",
				client: createdClient,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("[admin/clients][POST] error:", error);
		return jsonFromError(error, "Error al crear el cliente");
	}
}
