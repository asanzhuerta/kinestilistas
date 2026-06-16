import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	badRequestError,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { RegisterAdminUserBody } from "@/lib/contracts/admin-user";
import { ROLE_IDS } from "@/lib/typeorm/constants/catalog-ids";
import { resolveAdminUserRoleId } from "@/lib/typeorm/services/users/admin-user-role-resolvers";
import { registerUserByAdmin } from "@/lib/typeorm/services/users/user";

// POST /api/admin/register-user
// Registra manualmente un nuevo usuario desde administración con el rol indicado.
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
		const body = await readJsonBody<RegisterAdminUserBody>(request);
		const roleId = resolveAdminUserRoleId(body.type);

		if (roleId === ROLE_IDS.CLIENT && !String(body.commercialId ?? "").trim()) {
			return badRequestError(
				"Debes indicar el comercial asignado para crear un cliente",
			);
		}

		const createdUser = await registerUserByAdmin({
			name: String(body.name ?? ""),
			email: String(body.email ?? ""),
			password: String(body.password ?? ""),
			company: body.company ?? null,
			phone: body.phone ?? null,
			roleId,
			commercialId: body.commercialId ?? null,
			performedByUserId: user.id,
		});

		if (!createdUser) {
			return jsonFromError(
				{ message: "No se pudo recuperar el usuario creado", status: 500 },
				"Error al crear el usuario",
			);
		}

		return NextResponse.json(
			{
				message: "Usuario creado correctamente",
				userId: createdUser.id,
			},
			{ status: 201 },
		);
	} catch (error) {
		console.error("[admin/register-user] error:", error);
		return jsonFromError(error, "Error al crear el usuario");
	}
}
