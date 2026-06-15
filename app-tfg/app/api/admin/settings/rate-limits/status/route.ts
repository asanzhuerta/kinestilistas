import { NextResponse } from "next/server";
import { getRateLimitDiagnostics } from "@/lib/admin/rate-limit-diagnostics";
import {
	jsonFromError,
	notFoundError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";

function isTechnicalRateLimitSettingsEnabled() {
	return process.env.ADMIN_RATE_LIMIT_SETTINGS_ENABLED === "true";
}

export async function GET() {
	if (!isTechnicalRateLimitSettingsEnabled()) {
		return notFoundError("Configuración técnica no disponible");
	}

	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const diagnostics = await getRateLimitDiagnostics();
		return NextResponse.json(diagnostics, { status: 200 });
	} catch (error) {
		console.error("[admin/settings/rate-limits/status][GET] error:", error);
		return jsonFromError(
			error,
			"Error al obtener el diagnóstico de límites de peticiones",
		);
	}
}
