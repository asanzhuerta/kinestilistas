import { NextResponse } from "next/server";
import type { RouteContext } from "@/lib/contracts/api";
import {
	jsonFromError,
	notFoundError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { AdminUpsertCustomerSegmentBody } from "@/lib/contracts/communications";
import { buildAdminUpsertCustomerSegmentInput } from "@/lib/contracts/communications";
import {
	deleteCustomerSegment,
	getCustomerSegmentById,
	updateCustomerSegment,
} from "@/lib/typeorm/services/communications/communications";

export async function GET(_: Request, context: RouteContext) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const segment = await getCustomerSegmentById(id);

		if (!segment) {
			return notFoundError("Rango no encontrado", "CUSTOMER_SEGMENT_NOT_FOUND");
		}

		return NextResponse.json(segment, { status: 200 });
	} catch (error) {
		console.error("[admin/communications/segments/[id]][GET] error:", error);
		return jsonFromError(error, "Error al obtener rango");
	}
}

export async function PATCH(request: Request, context: RouteContext) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const body = await readJsonBody<AdminUpsertCustomerSegmentBody>(request);
		const segment = await updateCustomerSegment({
			segmentId: id,
			...buildAdminUpsertCustomerSegmentInput(body),
		});

		return NextResponse.json(segment, { status: 200 });
	} catch (error) {
		console.error("[admin/communications/segments/[id]][PATCH] error:", error);
		return jsonFromError(error, "Error al actualizar rango");
	}
}

export async function DELETE(_: Request, context: RouteContext) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const { id } = await context.params;
		const deleted = await deleteCustomerSegment(id);

		return NextResponse.json(deleted, { status: 200 });
	} catch (error) {
		console.error("[admin/communications/segments/[id]][DELETE] error:", error);
		return jsonFromError(error, "Error al eliminar rango");
	}
}
