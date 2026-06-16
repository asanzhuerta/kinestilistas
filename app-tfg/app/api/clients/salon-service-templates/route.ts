import { NextResponse } from "next/server";
import {
	buildCreateSalonServiceTemplateInput,
	type CreateSalonServiceTemplateBody,
} from "@/lib/contracts/salon";
import {
	enforceApiRateLimit,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	createSalonServiceTemplateForClientUser,
	listSalonServiceTemplatesForClientUser,
} from "@/lib/typeorm/services/salon/salon-service-template";

export async function GET(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const templates = await listSalonServiceTemplatesForClientUser(user.id);
		return NextResponse.json(templates, { status: 200 });
	} catch (error) {
		console.error("[clients/salon-service-templates][GET] error:", error);
		return jsonFromError(error, "Error al obtener las plantillas técnicas");
	}
}

export async function POST(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<CreateSalonServiceTemplateBody>(request);
		const template = await createSalonServiceTemplateForClientUser(
			user.id,
			buildCreateSalonServiceTemplateInput(body),
		);

		return NextResponse.json(template, { status: 201 });
	} catch (error) {
		console.error("[clients/salon-service-templates][POST] error:", error);
		return jsonFromError(error, "Error al crear la plantilla técnica");
	}
}
