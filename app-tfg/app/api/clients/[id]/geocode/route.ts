import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { canUpdateClient } from "@/lib/api/client-access";
import {
	enforceApiRateLimit,
	badRequestError,
	jsonFromError,
	notFoundError,
	unauthorizedError,
} from "@/lib/api/server";
import type { RouteContext, SessionLike } from "@/lib/contracts/api";
import { geocodeFreeTextAddress } from "@/lib/geocoding/geocode-address";
import { getClientById } from "@/lib/typeorm/services/commercial/client";

// GET /api/clients/[id]/geocode?q=address
// Busca coordenadas sugeridas para una dirección del cliente antes de guardarla en su ficha.
export async function GET(request: Request, context: RouteContext) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	try {
		const session = (await auth()) as SessionLike;

		if (!session?.user) {
			return unauthorizedError();
		}

		const { id } = await context.params;
		const client = await getClientById(id);

		if (!client) {
			return notFoundError("Cliente no encontrado");
		}

		if (!canUpdateClient(session, client)) {
			return unauthorizedError();
		}

		const { searchParams } = new URL(request.url);
		const query = searchParams.get("q")?.trim() ?? "";

		if (!query) {
			return badRequestError("Introduce una dirección para buscar");
		}

		const result = await geocodeFreeTextAddress({ query });

		if (!result) {
			return notFoundError(
				"No se encontró ninguna ubicación para esa dirección",
			);
		}

		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		console.error("[clients/[id]/geocode][GET] error:", error);
		return jsonFromError(error, "Error al buscar la dirección");
	}
}
