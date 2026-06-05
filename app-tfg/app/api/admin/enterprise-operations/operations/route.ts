import { NextResponse } from "next/server";
import {
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { CreateIntegrationOperationBody } from "@/lib/contracts/enterprise-operations";
import { createIntegrationOperation } from "@/lib/typeorm/services/admin/enterprise-operations";

export async function POST(request: Request) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<CreateIntegrationOperationBody>(request);
		const operation = await createIntegrationOperation(body);

		return NextResponse.json(operation, { status: 201 });
	} catch (error) {
		console.error("[admin/enterprise-operations/operations][POST] error:", error);
		return jsonFromError(
			error,
			"Error al registrar la operacion de integracion",
		);
	}
}
