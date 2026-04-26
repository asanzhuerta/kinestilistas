import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	getSessionUser,
	unauthorizedError,
} from "@/lib/api/server";
import { deactivateUser } from "@/lib/typeorm/services/users/user";

export async function POST(request: Request, { params }: RouteContext) {
	const user = await getSessionUser();

	if (!user || user.role !== "admin") {
		return unauthorizedError();
	}

	const { id } = await params;

	try {
		await deactivateUser({
			userId: id,
			performedByUserId: user.id,
			performedByEmail: user.email ?? null,
		});

		return NextResponse.redirect(new URL("/admin/users/usuarios", request.url));
	} catch (error) {
		console.error("Error desactivando usuario:", error);

		if (
			error instanceof Error &&
			(error.name === "DeactivateUserError" || "code" in error)
		) {
			const code = "code" in error ? error.code : null;

			if (code === "USER_NOT_FOUND") {
				return NextResponse.json({ error: error.message }, { status: 404 });
			}

			if (code === "SELF_DEACTIVATION_NOT_ALLOWED") {
				return NextResponse.json({ error: error.message }, { status: 400 });
			}
		}

		return NextResponse.json(
			{ error: "Error al desactivar el usuario" },
			{ status: 500 },
		);
	}
}
