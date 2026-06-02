import { getDataSource } from "../lib/typeorm/data-source";
import { CommercialVisit } from "../lib/typeorm/entities/CommercialVisit";
import { Order } from "../lib/typeorm/entities/Order";

type CleanupPayload = {
	orderIds?: string[];
	visitIds?: string[];
};

function parseCsvEnv(value: string | undefined) {
	return String(value ?? "")
		.split(",")
		.map((entry) => entry.trim())
		.filter(Boolean);
}

function parsePayload(raw: string | undefined): CleanupPayload {
	if (!raw) {
		return {
			orderIds: parseCsvEnv(process.env.M4_ORDER_IDS),
			visitIds: parseCsvEnv(process.env.M4_VISIT_IDS),
		};
	}

	try {
		const parsed = JSON.parse(raw) as CleanupPayload;

		return {
			orderIds: Array.isArray(parsed.orderIds)
				? parsed.orderIds.filter((value): value is string => Boolean(value))
				: [],
			visitIds: Array.isArray(parsed.visitIds)
				? parsed.visitIds.filter((value): value is string => Boolean(value))
				: [],
		};
	} catch {
		return {
			orderIds: parseCsvEnv(process.env.M4_ORDER_IDS),
			visitIds: parseCsvEnv(process.env.M4_VISIT_IDS),
		};
	}
}

async function main() {
	const payload = parsePayload(process.argv[2]);
	const ds = await getDataSource();

	try {
		if (payload.orderIds && payload.orderIds.length > 0) {
			await ds.getRepository(Order).delete(payload.orderIds);
		}

		if (payload.visitIds && payload.visitIds.length > 0) {
			await ds.getRepository(CommercialVisit).delete(payload.visitIds);
		}

		console.log(
			JSON.stringify({
				orderIdsDeleted: payload.orderIds?.length ?? 0,
				visitIdsDeleted: payload.visitIds?.length ?? 0,
			}),
		);
	} finally {
		await ds.destroy();
	}
}

void main().catch((error) => {
	console.error("[m4-cleanup-fixtures] error:", error);
	process.exit(1);
});
