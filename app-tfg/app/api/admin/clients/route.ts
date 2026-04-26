import { NextResponse } from "next/server";
import {
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	createClient,
	listClients,
} from "@/lib/typeorm/services/commercial/client";

type CreateClientBody = {
	name?: string;
	contactName?: string | null;
	taxId?: string | null;
	address?: string;
	city?: string;
	postalCode?: string | null;
	province?: string | null;
	userId?: string;
	notes?: string | null;
};

export async function GET() {
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

export async function POST(request: Request) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<CreateClientBody>(request);

		const createdClient = await createClient({
			name: String(body.name ?? ""),
			contactName: body.contactName ?? null,
			taxId: body.taxId ?? null,
			address: String(body.address ?? ""),
			city: String(body.city ?? ""),
			postalCode: body.postalCode ?? null,
			province: body.province ?? null,
			userId: String(body.userId ?? ""),
			notes: body.notes ?? null,
		});

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
