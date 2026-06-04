import {
	buildAdminAuditExport,
	type AdminAuditExportKind,
} from "@/lib/admin/audit-export";

function assertCondition(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

async function assertAuditExport(kind: AdminAuditExportKind, expectedHeader: string) {
	const exportFile = await buildAdminAuditExport({
		kind,
		days: 365,
		limit: 50,
		now: new Date("2026-06-04T00:00:00.000Z"),
	});

	assertCondition(
		exportFile.content.startsWith(expectedHeader),
		`La exportacion ${kind} no contiene la cabecera CSV esperada`,
	);
	assertCondition(
		exportFile.contentType === "text/csv; charset=utf-8",
		`La exportacion ${kind} no declara content type CSV`,
	);
	assertCondition(
		exportFile.fileName === `kinestilistas-audit-${kind}-2026-06-04.csv`,
		`La exportacion ${kind} no genera un nombre de fichero estable`,
	);
	assertCondition(
		exportFile.rowCount >= 0,
		`La exportacion ${kind} no informa del numero de filas`,
	);
	assertCondition(
		exportFile.content.split("\n").length >= 1,
		`La exportacion ${kind} debe incluir al menos la fila de cabecera`,
	);
}

async function main() {
	await assertAuditExport(
		"access",
		"id,created_at,event,result,user,email_attempted,ip_address,session_state,failure_reason,user_agent",
	);
	await assertAuditExport(
		"management",
		"id,created_at,action,target_user,performed_by,previous_status,new_status,previous_role,new_role,reason,notes",
	);

	console.log("PASS exportacion CSV de accesos M7 preparada");
	console.log("PASS exportacion CSV de acciones administrativas M7 preparada");
	console.log("PASS nombres de fichero y content type CSV consistentes");
}

main()
	.then(() => {
		console.log("M7 audit export smoke OK");
	})
	.catch((error) => {
		console.error("M7 audit export smoke FAILED");
		console.error(error);
		process.exitCode = 1;
	});
