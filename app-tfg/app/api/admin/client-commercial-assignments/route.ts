import { NextResponse } from "next/server";
import {
	badRequestError,
	getRequestSearchParams,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { UpsertClientCommercialAssignmentBody } from "@/lib/contracts/client-commercial-assignment";
import {
	assignClientToCommercial,
	getActiveAssignmentByClientId,
	listActiveAssignmentsByCommercialId,
	reassignClientToCommercial,
	unassignClientFromCommercial,
} from "@/lib/typeorm/services/commercial/client-commercial-assignment";

// GET /api/admin/client-commercial-assignments?clientId=...
// GET /api/admin/client-commercial-assignments?commercialId=...
// Consulta asignaciones activas o historicas entre clientes y comerciales segun el filtro indicado.
export async function GET(request: Request) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const searchParams = getRequestSearchParams(request);
		const clientId = searchParams.get("clientId");
		const commercialId = searchParams.get("commercialId");

		if (clientId) {
			const assignment = await getActiveAssignmentByClientId(clientId);
			return NextResponse.json(assignment, { status: 200 });
		}

		if (commercialId) {
			const assignments = await listActiveAssignmentsByCommercialId(commercialId);
			return NextResponse.json(assignments, { status: 200 });
		}

		return badRequestError("Debes indicar clientId o commercialId");
	} catch (error) {
		console.error("[admin/client-commercial-assignments][GET] error:", error);
		return jsonFromError(error, "Error al obtener asignaciones comerciales");
	}
}

// POST /api/admin/client-commercial-assignments
// Crea o reasigna la vinculacion entre un cliente y un comercial desde administracion.
export async function POST(request: Request) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<UpsertClientCommercialAssignmentBody>(request);

		if (!body.clientId) {
			return badRequestError("clientId es obligatorio");
		}

		if (body.mode === "unassign") {
			const assignment = await unassignClientFromCommercial({
				clientId: body.clientId,
				unassignedByUserId: user.id,
				notes: body.notes,
			});

			return NextResponse.json(assignment, { status: 200 });
		}

		if (!body.commercialId) {
			return badRequestError("commercialId es obligatorio");
		}

		if (body.mode === "reassign") {
			const assignment = await reassignClientToCommercial({
				clientId: body.clientId,
				commercialId: body.commercialId,
				assignedByUserId: user.id,
				notes: body.notes,
			});

			return NextResponse.json(assignment, { status: 200 });
		}

		const assignment = await assignClientToCommercial({
			clientId: body.clientId,
			commercialId: body.commercialId,
			assignedByUserId: user.id,
			notes: body.notes,
		});

		return NextResponse.json(assignment, { status: 201 });
	} catch (error) {
		console.error("[admin/client-commercial-assignments][POST] error:", error);
		return jsonFromError(error, "Error al guardar la asignacion comercial");
	}
}
