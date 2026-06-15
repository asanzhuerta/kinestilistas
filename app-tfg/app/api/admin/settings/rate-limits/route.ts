import { NextResponse } from "next/server";
import {
	jsonFromError,
	notFoundError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { UpdateRateLimitPolicySettingsBody } from "@/lib/contracts/rate-limit-settings";
import {
	listRateLimitPolicySettings,
	updateRateLimitPolicySettings,
} from "@/lib/typeorm/services/security/rate-limit-policy";

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
		const policies = await listRateLimitPolicySettings();
		return NextResponse.json(policies, { status: 200 });
	} catch (error) {
		console.error("[admin/settings/rate-limits][GET] error:", error);
		return jsonFromError(
			error,
			"Error al obtener la configuración de límites de peticiones",
		);
	}
}

export async function PUT(request: Request) {
	if (!isTechnicalRateLimitSettingsEnabled()) {
		return notFoundError("Configuración técnica no disponible");
	}

	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<UpdateRateLimitPolicySettingsBody>(request);
		const policies = await updateRateLimitPolicySettings({
			policies: Array.isArray(body.policies) ? body.policies : [],
		});

		return NextResponse.json(policies, { status: 200 });
	} catch (error) {
		console.error("[admin/settings/rate-limits][PUT] error:", error);
		return jsonFromError(
			error,
			"Error al guardar la configuración de límites de peticiones",
		);
	}
}
