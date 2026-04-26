import { NextResponse } from "next/server";
import {
	forbiddenError,
	getRequestSearchParams,
	getSessionUser,
	jsonFromError,
	parsePositiveInteger,
	readJsonBody,
	unauthorizedError,
} from "@/lib/api/server";
import {
	listUsers,
	listUsersPaginated,
	registerUserByAdmin,
} from "@/lib/typeorm/services/users/user";

type CreateUserBody = {
	name?: string;
	email?: string;
	password?: string;
	company?: string | null;
	phone?: string | null;
	roleId?: number | string;
};

export async function GET(request: Request) {
	const user = await getSessionUser();

	if (!user) {
		return unauthorizedError("No autenticado");
	}

	if (user.role !== "admin") {
		return forbiddenError();
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

export async function POST(request: Request) {
	const user = await getSessionUser();

	if (!user) {
		return unauthorizedError("No autenticado");
	}

	if (user.role !== "admin") {
		return forbiddenError();
	}

	try {
		const body = await readJsonBody<CreateUserBody>(request);

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
