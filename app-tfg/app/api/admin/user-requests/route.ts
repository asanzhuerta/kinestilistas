import { NextResponse } from "next/server";
import {
	forbiddenError,
	getSessionUser,
	jsonFromError,
	unauthorizedError,
} from "@/lib/api/server";
import { listUserRequests } from "@/lib/typeorm/services/users/request";

export async function GET() {
	const user = await getSessionUser();

	if (!user) {
		return unauthorizedError("No autenticado");
	}

	if (user.role !== "admin") {
		return forbiddenError();
	}

	try {
		const requests = await listUserRequests();
		return NextResponse.json(requests, { status: 200 });
	} catch (error) {
		console.error("Error listing user requests:", error);
		return jsonFromError(error, "Error interno del servidor");
	}
}
