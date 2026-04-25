import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
	getClientById,
	updateClient,
} from "@/lib/typeorm/services/commercial/client";

// --------------------------------------------------------------------------
// Tipos
// --------------------------------------------------------------------------

type RouteContext = {
	params: Promise<{
		id: string;
	}>;
};

type UpdateClientBody = {
	name?: string;
	contactName?: string | null;
	taxId?: string | null;
	address?: string;
	city?: string;
	postalCode?: string | null;
	province?: string | null;
	lat?: number | string | null;
	lng?: number | string | null;
	visitWindowStartTime?: string | null;
	visitWindowEndTime?: string | null;
	notes?: string | null;
};

type SessionLike = {
	user?: {
		id: string;
		role: string;
	};
} | null;

type ClientAccessTarget = {
	user?: {
		id?: string | null;
	} | null;
	linkedUser?: {
		id?: string | null;
	} | null;
};

// --------------------------------------------------------------------------
// Helpers
// --------------------------------------------------------------------------

// Compatibilidad temporal:
// - client.user?.id -> modelo nuevo (PK compartida con users.id)
// - client.linkedUser?.id -> modelo anterior
function getClientOwnerUserId(client: ClientAccessTarget) {
	return client?.user?.id ?? client?.linkedUser?.id ?? null;
}

async function canReadClient(
	session: SessionLike,
	client: ClientAccessTarget,
) {
	if (!session?.user) {
		return false;
	}

	if (session.user.role === "admin") {
		return true;
	}

	if (session.user.role === "commercial") {
		return true;
	}

	if (session.user.role === "client") {
		return getClientOwnerUserId(client) === session.user.id;
	}

	return false;
}

function canUpdateClient(session: SessionLike, client: ClientAccessTarget) {
	if (!session?.user) {
		return false;
	}

	if (session.user.role === "admin") {
		return true;
	}

	if (session.user.role === "client") {
		return getClientOwnerUserId(client) === session.user.id;
	}

	return false;
}

// --------------------------------------------------------------------------
// GET /api/clients/[id]
// --------------------------------------------------------------------------

export async function GET(_: Request, context: RouteContext) {
	try {
		const session = (await auth()) as SessionLike;
		const { id } = await context.params;

		if (!session?.user) {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const client = await getClientById(id);

		if (!client) {
			return NextResponse.json(
				{ error: "Cliente no encontrado" },
				{ status: 404 },
			);
		}

		const allowed = await canReadClient(session, client);

		if (!allowed) {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		return NextResponse.json(client, { status: 200 });
	} catch (error) {
		console.error("[clients/[id]][GET] error:", error);

		return NextResponse.json(
			{ error: "Error al obtener el cliente" },
			{ status: 500 },
		);
	}
}

// --------------------------------------------------------------------------
// PATCH /api/clients/[id]
// --------------------------------------------------------------------------

export async function PATCH(request: Request, context: RouteContext) {
	try {
		const session = (await auth()) as SessionLike;
		const { id } = await context.params;

		if (!session?.user) {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const existingClient = await getClientById(id);

		if (!existingClient) {
			return NextResponse.json(
				{ error: "Cliente no encontrado" },
				{ status: 404 },
			);
		}

		if (!canUpdateClient(session, existingClient)) {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const body = (await request.json()) as UpdateClientBody;

		await updateClient({
			clientId: id,
			name: String(body.name ?? existingClient.name),
			contactName: body.contactName ?? existingClient.contact_name,
			taxId: body.taxId ?? existingClient.tax_id,
			address: String(body.address ?? existingClient.address),
			city: String(body.city ?? existingClient.city),
			postalCode: body.postalCode ?? existingClient.postal_code,
			province: body.province ?? existingClient.province,
			lat: body.lat ?? existingClient.lat,
			lng: body.lng ?? existingClient.lng,
			visitWindowStartTime:
				body.visitWindowStartTime ?? existingClient.visit_window_start_time,
			visitWindowEndTime:
				body.visitWindowEndTime ?? existingClient.visit_window_end_time,
			notes: body.notes ?? existingClient.notes,
		});

		return NextResponse.json(
			{ message: "Cliente actualizado correctamente" },
			{ status: 200 },
		);
	} catch (error) {
		console.error("[clients/[id]][PATCH] error:", error);

		return NextResponse.json(
			{ error: "Error al actualizar el cliente" },
			{ status: 500 },
		);
	}
}
