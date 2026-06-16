import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logoutUserSession } from "@/lib/typeorm/services/auth/logout-user-session";
import { enforceApiRateLimit } from "@/lib/api/server";

// POST /api/auth/logout
// Cierra la sesión actual y marca como revocada la sesión persistida del usuario.
export async function POST(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	try {
		const session = await auth();

		if (!session?.accessSessionId) {
			return NextResponse.json({ ok: true });
		}

		await logoutUserSession({
			sessionToken: session.accessSessionId,
			userId: session.user?.id ?? null,
			emailAttempted: session.user?.email ?? null,
		});

		return NextResponse.json({ ok: true });
	} catch (error) {
		console.error("[logout] error:", error);
		return NextResponse.json({ message: "Error al cerrar sesión" }, { status: 500 });
	}
}
