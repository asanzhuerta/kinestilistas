import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	getRequestSearchParams,
	jsonFromError,
	parsePositiveInteger,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { CreateAdminUserBody } from "@/lib/contracts/admin-user";
import {
	listUsers,
	listUsersPaginated,
	registerUserByAdmin,
} from "@/lib/typeorm/services/users/user";

// GET /api/admin/users
// Lista usuarios del sistema, con soporte opcional de paginación y búsqueda.
export async function GET(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const searchParams = getRequestSearchParams(request);
		const pageParam = searchParams.get("page");
		const pageSizeParam = searchParams.get("pageSize");
		const searchParam = searchParams.get("search");

		const shouldUsePagination =
			pageParam !== null || pageSizeParam !== null || searchParam !== null;

		if (shouldUsePagination) {
			const result = await listUsersPaginated({
				page: parsePositiveInteger(pageParam, 1),
				pageSize: parsePositiveInteger(pageSizeParam, 20, 50),
				search: searchParam?.trim() || undefined,
			});

			return NextResponse.json(result, { status: 200 });
		}

		const users = await listUsers();
		return NextResponse.json(users, { status: 200 });
	} catch (error) {
		console.error("Error listing users:", error);
		return jsonFromError(error, "Error interno del servidor");
	}
}

// POST /api/admin/users
// Crea un nuevo usuario directamente desde administración usando un roleId explicito.
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
		const body = await readJsonBody<CreateAdminUserBody>(request);

		const createdUser = await registerUserByAdmin({
			name: body.name ?? "",
			email: body.email ?? "",
			password: body.password ?? "",
			company: body.company ?? null,
			phone: body.phone ?? null,
			roleId: Number(body.roleId),
			performedByUserId: user.id,
		});

		return NextResponse.json(createdUser, { status: 201 });
	} catch (error) {
		console.error("Error creating user:", error);
		return jsonFromError(error, "Error interno del servidor");
	}
}
