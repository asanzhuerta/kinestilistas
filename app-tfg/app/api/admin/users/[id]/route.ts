import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getDataSource } from "@/lib/typeorm/data-source";
import { User } from "@/lib/typeorm/entities/User";
import { updateUser, UpdateUserError } from "@/lib/typeorm/services/users/user";

type RouteContext = {
	params: Promise<{ id: string }>;
};

type UpdateUserClientProfileBody = {
	name?: string;
	contact_name?: string | null;
	tax_id?: string | null;
	address?: string;
	city?: string;
	postal_code?: string | null;
	province?: string | null;
	notes?: string | null;
};

type UpdateUserRequestBody = {
	name?: string;
	email?: string;
	company?: string | null;
	phone?: string | null;
	profile_image_url?: string | null;
	roleId?: number;
	statusId?: number;
	password?: string;
	confirmPassword?: string;
	clientProfile?: UpdateUserClientProfileBody | null;
};

export async function PATCH(request: Request, { params }: RouteContext) {
	try {
		const session = await auth();

		if (!session) {
			return NextResponse.json({ message: "No autenticado" }, { status: 401 });
		}

		if (session.user?.role !== "admin") {
			return NextResponse.json({ message: "No autorizado" }, { status: 403 });
		}

		if (!session.user?.id) {
			return NextResponse.json({ message: "Sesión inválida" }, { status: 401 });
		}

		const { id } = await params;
		const body = (await request.json()) as UpdateUserRequestBody;

		// Impide que un administrador se cambie su propio rol desde este endpoint.
		// Si el usuario objetivo es el mismo que el de la sesión, se conserva el rol actual.
		let safeRoleId = Number(body.roleId);

		if (id === session.user.id) {
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
				return NextResponse.json(
					{
						message: "Usuario no encontrado",
						code: "USER_NOT_FOUND",
					},
					{ status: 404 },
				);
			}

			safeRoleId = currentUser.role_id;
		}

		const result = await updateUser({
			userId: id,
			performedByUserId: session.user.id,
			name: body.name ?? "",
			email: body.email ?? "",
			company: body.company ?? null,
			phone: body.phone ?? null,
			profile_image_url: body.profile_image_url ?? null,
			roleId: safeRoleId,
			statusId: Number(body.statusId),
			password: body.password ?? "",
			confirmPassword: body.confirmPassword ?? "",
			clientProfile: body.clientProfile ?? null,
		});

		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		if (error instanceof UpdateUserError) {
			return NextResponse.json(
				{
					message: error.message,
					code: error.code,
				},
				{ status: error.status },
			);
		}

		console.error("Error al actualizar usuario:", error);

		return NextResponse.json(
			{
				message: "Error interno del servidor",
				code: "INTERNAL_SERVER_ERROR",
			},
			{ status: 500 },
		);
	}
}
