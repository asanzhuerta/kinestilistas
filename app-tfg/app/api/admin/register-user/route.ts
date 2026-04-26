import { NextResponse } from "next/server";
import {
	badRequestError,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { RegisterAdminUserBody } from "@/lib/contracts/admin-user";
import { ROLE_IDS } from "@/lib/typeorm/constants/catalog-ids";
import { registerUserByAdmin } from "@/lib/typeorm/services/users/user";

function resolveRoleIdFromType(type: string | undefined) {
	if (type === "comercial") {
		return ROLE_IDS.COMMERCIAL;
	}

	if (type === "cliente") {
		return ROLE_IDS.CLIENT;
	}

	return 0;
}

export async function POST(request: Request) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<RegisterAdminUserBody>(request);
		const roleId = resolveRoleIdFromType(body.type);

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
