import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { geocodeFreeTextAddress } from "@/lib/geocoding/geocode-address";
import { getClientById } from "@/lib/typeorm/services/commercial/client";

type SessionLike = {
	user?: {
		id: string;
		role: string;
	};
} | null;

type RouteContext = {
	params: Promise<{
		id: string;
	}>;
};

type ClientOwnerShape = {
	user?: {
		id?: string | null;
	} | null;
	linkedUser?: {
		id?: string | null;
	} | null;
};

function getClientOwnerUserId(client: ClientOwnerShape) {
	return client?.user?.id ?? client?.linkedUser?.id ?? null;
}

function canGeocodeClientLocation(
	session: SessionLike,
	client: ClientOwnerShape,
) {
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

export async function GET(request: Request, context: RouteContext) {
	try {
		const session = (await auth()) as SessionLike;

		if (!session?.user) {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const { id } = await context.params;
		const client = await getClientById(id);

		if (!client) {
			return NextResponse.json(
				{ error: "Cliente no encontrado" },
				{ status: 404 },
			);
		}

		if (!canGeocodeClientLocation(session, client)) {
			return NextResponse.json({ error: "No autorizado" }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const query = searchParams.get("q")?.trim() ?? "";

		if (!query) {
			return NextResponse.json(
				{ error: "Introduce una dirección para buscar" },
				{ status: 400 },
			);
		}

		const result = await geocodeFreeTextAddress({ query });

		if (!result) {
			return NextResponse.json(
				{ error: "No se encontró ninguna ubicación para esa dirección" },
				{ status: 404 },
			);
		}

		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		console.error("[clients/[id]/geocode][GET] error:", error);

		return NextResponse.json(
			{ error: "Error al buscar la dirección" },
			{ status: 500 },
		);
	}
}
