import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { logoutUserSession } from "@/lib/typeorm/services/auth/logout-user-session";

// POST /api/auth/logout
// Cierra la sesion actual y marca como revocada la sesion persistida del usuario.
export async function POST() {
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
		return NextResponse.json({ message: "Error en logout" }, { status: 500 });
	}
}
