import { NextResponse } from "next/server";
import { requireRoleUser, unauthorizedError } from "@/lib/api/server";
import {
	listIntegrationStatusItems,
	summarizeIntegrationStatusItems,
} from "@/lib/integrations/operational-status";

export async function GET() {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	const items = listIntegrationStatusItems();

	return NextResponse.json(
		{
			summary: summarizeIntegrationStatusItems(items),
			items,
		},
		{ status: 200 },
	);
}
