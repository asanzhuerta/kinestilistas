import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	badRequestError,
	getRequestSearchParams,
	jsonFromError,
	parsePositiveInteger,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	buildAdminAuditExport,
	type AdminAuditExportKind,
} from "@/lib/admin/audit-export";

function parseExportKind(value: string | null): AdminAuditExportKind | null {
	if (value === "access" || value === "management") {
		return value;
	}

	return null;
}

export async function GET(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	const searchParams = getRequestSearchParams(request);
	const kind = parseExportKind(searchParams.get("type") ?? "access");

	if (!kind) {
		return badRequestError(
			"Tipo de exportación de auditoría no válido",
			"AUDIT_EXPORT_INVALID_TYPE",
		);
	}

	try {
		const exportFile = await buildAdminAuditExport({
			kind,
			days: parsePositiveInteger(searchParams.get("days"), 30, 365),
			limit: parsePositiveInteger(searchParams.get("limit"), 200, 1000),
		});

		return new NextResponse(exportFile.content, {
			status: 200,
			headers: {
				"Cache-Control": "no-store",
				"Content-Disposition": `attachment; filename="${exportFile.fileName}"`,
				"Content-Type": exportFile.contentType,
			},
		});
	} catch (error) {
		console.error("[admin/audit/export][GET] error:", error);
		return jsonFromError(error, "Error al exportar la auditoría");
	}
}
