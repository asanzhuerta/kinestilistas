import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import type { UpdateAdminUserBody } from "@/lib/contracts/user-profile";
import {
	forbiddenError,
	getSessionUser,
	jsonFromError,
	notFoundError,
	readJsonBody,
	unauthorizedError,
} from "@/lib/api/server";
import { getDataSource } from "@/lib/typeorm/data-source";
import { User } from "@/lib/typeorm/entities/User";
import { updateUser } from "@/lib/typeorm/services/users/user";

export async function PATCH(request: Request, { params }: RouteContext) {
	const sessionUser = await getSessionUser();

	if (!sessionUser) {
		return unauthorizedError("No autenticado");
	}

	if (sessionUser.role !== "admin") {
		return forbiddenError();
	}

	try {
		const { id } = await params;
		const body = await readJsonBody<UpdateAdminUserBody>(request);
		const clientProfile = body.clientProfile
			? {
					name:
						body.clientProfile.name === null
							? undefined
							: body.clientProfile.name,
					contact_name: body.clientProfile.contact_name,
					tax_id: body.clientProfile.tax_id,
					address:
						body.clientProfile.address === null
							? undefined
							: body.clientProfile.address,
					city:
						body.clientProfile.city === null
							? undefined
							: body.clientProfile.city,
					postal_code: body.clientProfile.postal_code,
					province: body.clientProfile.province,
					lat: body.clientProfile.lat,
					lng: body.clientProfile.lng,
					visit_window_start_time:
						body.clientProfile.visit_window_start_time,
					visit_window_end_time: body.clientProfile.visit_window_end_time,
					notes: body.clientProfile.notes,
				}
			: null;

		let safeRoleId = Number(body.roleId);

		if (id === sessionUser.id) {
			const ds = await getDataSource();
			const userRepo = ds.getRepository(User);
			const currentUser = await userRepo.findOne({
				where: { id },
				select: {
					id: true,
					role_id: true,
				},
			});

			if (!currentUser) {
				return notFoundError("Usuario no encontrado", "USER_NOT_FOUND");
			}

			safeRoleId = currentUser.role_id;
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
			statusId: Number(body.statusId),
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
