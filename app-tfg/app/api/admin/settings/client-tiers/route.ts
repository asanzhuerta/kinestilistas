import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { UpdateClientTierPolicySettingsBody } from "@/lib/contracts/client-tier-settings";
import {
	getClientTierPolicySettings,
	updateClientTierPolicySettings,
} from "@/lib/typeorm/services/clients/client-tier-settings";

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
		const settings = await getClientTierPolicySettings();
		return NextResponse.json(settings, { status: 200 });
	} catch (error) {
		console.error("[admin/settings/client-tiers][GET] error:", error);
		return jsonFromError(error, "Error al obtener la política de rangos");
	}
}

export async function PUT(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body =
			await readJsonBody<UpdateClientTierPolicySettingsBody>(request);
		const settings = await updateClientTierPolicySettings(body);

		return NextResponse.json(settings, { status: 200 });
	} catch (error) {
		console.error("[admin/settings/client-tiers][PUT] error:", error);
		return jsonFromError(error, "Error al guardar la política de rangos");
	}
}
