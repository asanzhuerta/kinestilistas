import { NextResponse } from "next/server";
import { buildAdminOperationalReport } from "@/lib/admin/operational-report";
import {
	jsonFromError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";

export async function GET() {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const report = await buildAdminOperationalReport();

		return new NextResponse(report.content, {
			status: 200,
			headers: {
				"Cache-Control": "no-store",
				"Content-Disposition": `attachment; filename="${report.fileName}"`,
				"Content-Type": report.contentType,
			},
		});
	} catch (error) {
		console.error("[admin/operations/report][GET] error:", error);
		return jsonFromError(error, "Error al generar el informe operativo");
	}
}
