import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	enforceApiRateLimit,
	jsonFromError,
	notFoundError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	buildAdminUserClientProfileUpdate,
	type UpdateAdminUserBody,
} from "@/lib/contracts/user-profile";
import { getDataSource } from "@/lib/typeorm/data-source";
import { User } from "@/lib/typeorm/entities/User";
import { updateUser } from "@/lib/typeorm/services/users/user";

// PATCH /api/admin/users/[id]
// Actualiza los datos generales de un usuario y, si aplica, su perfil de cliente asociado.
export async function PATCH(request: Request, { params }: RouteContext) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const sessionUser = await requireRoleUser("admin");

	if (!sessionUser) {
		return unauthorizedError();
	}

	try {
		const { id } = await params;
		const body = await readJsonBody<UpdateAdminUserBody>(request);
		const clientProfile = buildAdminUserClientProfileUpdate(body.clientProfile);

		let safeRoleId = Number(body.roleId);

		if (id === sessionUser.id) {
			const ds = await getDataSource();
			const userRepo = ds.getRepository(User);
			const currentUser = await userRepo.findOne({
				where: { id },
				select: {
					id: true,
					role_id: true,
					status_id: true,
				},
			});

			if (!currentUser) {
				return notFoundError("Usuario no encontrado", "USER_NOT_FOUND");
			}

			safeRoleId = currentUser.role_id;
		}

		const ds = await getDataSource();
		const userRepo = ds.getRepository(User);
		const currentUser = await userRepo.findOne({
			where: { id },
			select: {
				id: true,
				status_id: true,
			},
		});

		if (!currentUser) {
			return notFoundError("Usuario no encontrado", "USER_NOT_FOUND");
		}

		const result = await updateUser({
			userId: id,
			performedByUserId: sessionUser.id,
			name: body.name ?? "",
			email: body.email ?? "",
			company: body.company ?? null,
			phone: body.phone ?? null,
			profile_image_url: body.profile_image_url ?? null,
			roleId: safeRoleId,
			statusId: currentUser.status_id,
			password: body.password ?? "",
			confirmPassword: body.confirmPassword ?? "",
			clientProfile,
		});

		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		console.error("Error al actualizar usuario:", error);
		return jsonFromError(error, "Error interno del servidor");
	}
}
