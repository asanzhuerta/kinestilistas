import { MoreThanOrEqual } from "typeorm";
import { getDataSource } from "@/lib/typeorm/data-source";
import { UserAccessLog } from "@/lib/typeorm/entities/UserAccessLog";
import { UserManagementLog } from "@/lib/typeorm/entities/UserManagementLog";

export type AdminAuditExportKind = "access" | "management";

type BuildAdminAuditExportInput = {
	kind: AdminAuditExportKind;
	days?: number;
	limit?: number;
	now?: Date;
};

const DEFAULT_DAYS = 30;
const MAX_DAYS = 365;
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;

function normalizePositiveInteger(
	value: number | undefined,
	fallback: number,
	max: number,
) {
	if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) {
		return fallback;
	}

	return Math.min(value, max);
}

function formatDate(value: Date | null | undefined) {
	return value ? value.toISOString() : "";
}

function formatUserLabel(
	user: { name?: string | null; email?: string | null } | null | undefined,
) {
	if (!user) {
		return "";
	}

	return user.name || user.email || "";
}

function escapeCsvValue(value: string | number | null | undefined) {
	const text = String(value ?? "");

	if (!/[",\r\n]/.test(text)) {
		return text;
	}

	return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(headers: string[], rows: Array<Array<string | number | null>>) {
	return [headers, ...rows]
		.map((row) => row.map((value) => escapeCsvValue(value)).join(","))
		.join("\n");
}

function buildFileName(kind: AdminAuditExportKind, now: Date) {
	const date = now.toISOString().slice(0, 10);
	return `kinestilistas-audit-${kind}-${date}.csv`;
}

export async function buildAdminAuditExport(input: BuildAdminAuditExportInput) {
	const now = input.now ?? new Date();
	const days = normalizePositiveInteger(input.days, DEFAULT_DAYS, MAX_DAYS);
	const limit = normalizePositiveInteger(input.limit, DEFAULT_LIMIT, MAX_LIMIT);
	const since = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
	const dataSource = await getDataSource();

	if (input.kind === "access") {
		const logs = await dataSource.getRepository(UserAccessLog).find({
			relations: {
				user: true,
				eventType: true,
				resultType: true,
			},
			where: {
				created_at: MoreThanOrEqual(since),
			},
			order: {
				created_at: "DESC",
			},
			take: limit,
		});
		const headers = [
			"id",
			"created_at",
			"event",
			"result",
			"user",
			"email_attempted",
			"ip_address",
			"session_state",
			"failure_reason",
			"user_agent",
		];
		const rows = logs.map((log) => [
			log.id,
			formatDate(log.created_at),
			log.eventType?.name ?? "",
			log.resultType?.name ?? "",
			formatUserLabel(log.user),
			log.email_attempted,
			log.ip_address,
			log.revoked_at ? "revoked" : log.session_token ? "active" : "none",
			log.failure_reason,
			log.user_agent,
		]);

		return {
			content: toCsv(headers, rows),
			contentType: "text/csv; charset=utf-8",
			fileName: buildFileName(input.kind, now),
			rowCount: logs.length,
		};
	}

	const logs = await dataSource.getRepository(UserManagementLog).find({
		relations: {
			targetUser: true,
			performedByUser: true,
			actionType: true,
			previousStatus: true,
			newStatus: true,
			previousRole: true,
			newRole: true,
		},
		where: {
			created_at: MoreThanOrEqual(since),
		},
		order: {
			created_at: "DESC",
		},
		take: limit,
	});
	const headers = [
		"id",
		"created_at",
		"action",
		"target_user",
		"performed_by",
		"previous_status",
		"new_status",
		"previous_role",
		"new_role",
		"reason",
		"notes",
	];
	const rows = logs.map((log) => [
		log.id,
		formatDate(log.created_at),
		log.actionType?.name ?? "",
		formatUserLabel(log.targetUser),
		formatUserLabel(log.performedByUser),
		log.previousStatus?.name ?? "",
		log.newStatus?.name ?? "",
		log.previousRole?.name ?? "",
		log.newRole?.name ?? "",
		log.reason,
		log.notes,
	]);

	return {
		content: toCsv(headers, rows),
		contentType: "text/csv; charset=utf-8",
		fileName: buildFileName(input.kind, now),
		rowCount: logs.length,
	};
}
