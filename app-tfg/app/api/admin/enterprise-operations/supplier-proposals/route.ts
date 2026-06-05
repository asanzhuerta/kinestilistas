import { NextResponse } from "next/server";
import {
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import type { GenerateSupplierOrderProposalBody } from "@/lib/contracts/enterprise-operations";
import { generateSupplierOrderProposal } from "@/lib/typeorm/services/admin/enterprise-operations";

export async function POST(request: Request) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<GenerateSupplierOrderProposalBody>(request);
		const proposal = await generateSupplierOrderProposal({
			...body,
			generatedByUserId: user.id,
		});

		return NextResponse.json(proposal, { status: 201 });
	} catch (error) {
		console.error(
			"[admin/enterprise-operations/supplier-proposals][POST] error:",
			error,
		);
		return jsonFromError(error, "Error al generar la propuesta a proveedor");
	}
}
