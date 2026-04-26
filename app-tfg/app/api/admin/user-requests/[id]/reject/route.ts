import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	badRequestError,
	getSessionUser,
	jsonFromError,
	unauthorizedError,
} from "@/lib/api/server";
import { rejectUserRequest } from "@/lib/typeorm/services/users/request";

async function getReasonFromRequest(request: Request) {
	const contentType = request.headers.get("content-type") ?? "";

	if (contentType.includes("application/json")) {
		const body = await request.json().catch(() => ({}));
		return String(body?.reason ?? "").trim();
	}

	if (
		contentType.includes("application/x-www-form-urlencoded") ||
		contentType.includes("multipart/form-data")
	) {
		const formData = await request.formData();
		return String(formData.get("reason") ?? "").trim();
	}

	return "";
}

export async function POST(request: Request, { params }: RouteContext) {
	const user = await getSessionUser();

	if (!user || user.role !== "admin") {
		return unauthorizedError();
	}

	try {
		const { id } = await params;
		const reason = await getReasonFromRequest(request);

		if (!reason) {
			return badRequestError("Debes indicar un motivo de rechazo");
		}

		await rejectUserRequest(id, user.id, reason);
		return NextResponse.json({ ok: true }, { status: 200 });
	} catch (error) {
		console.error("Error rejecting user request:", error);
		return jsonFromError(error, "Error al rechazar la solicitud");
	}
}
