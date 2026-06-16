import { NextResponse } from "next/server";
import { createRegisterRequest } from "@/lib/typeorm/services/users/request";
import { enforceApiRateLimit } from "@/lib/api/server";

type RegisterRequestBody = {
	email?: string;
	name?: string;
	company?: string;
	phone?: string;
	password?: string;
	roleId?: number;
};

// POST /api/auth/register-request
// Registra una nueva solicitud de alta pendiente de revisión administrativa.
export async function POST(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	try {
		const body = (await request.json()) as RegisterRequestBody;

		const email = String(body.email ?? "").trim().toLowerCase();
		const name = String(body.name ?? "").trim();
		const company = String(body.company ?? "").trim() || null;
		const phone = String(body.phone ?? "").trim() || null;
		const password = String(body.password ?? "");

		if (!email || !name || !password) {
			return NextResponse.json(
				{ error: "Faltan campos obligatorios" },
				{ status: 400 },
			);
		}

		await createRegisterRequest({
			email,
			name,
			company,
			phone,
			password,
		});

		return NextResponse.json(
			{ message: "Solicitud de registro enviada correctamente" },
			{ status: 201 },
		);
	} catch (error) {
		console.error("[register-request] error:", error);

		if (error instanceof Error) {
			return NextResponse.json({ error: error.message }, { status: 400 });
		}

		return NextResponse.json(
			{ error: "Error al procesar la solicitud de registro" },
			{ status: 500 },
		);
	}
}
