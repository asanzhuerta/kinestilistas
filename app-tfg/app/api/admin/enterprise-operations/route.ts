import { NextResponse } from "next/server";
import {
	jsonFromError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import { getEnterpriseOperationsSnapshot } from "@/lib/typeorm/services/admin/enterprise-operations";

export async function GET() {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const snapshot = await getEnterpriseOperationsSnapshot();
		return NextResponse.json(snapshot, { status: 200 });
	} catch (error) {
		console.error("[admin/enterprise-operations][GET] error:", error);
		return jsonFromError(error, "Error al obtener la operacion empresarial");
	}
}
