import { NextResponse } from "next/server";
import { requireRoleUser, unauthorizedError } from "@/lib/api/server";
import { getAdminOperationalOverview } from "@/lib/admin/operational-overview";

export async function GET() {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	const overview = await getAdminOperationalOverview();

	return NextResponse.json(overview, { status: 200 });
}
