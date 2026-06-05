import { buildAdminOperationalReport } from "@/lib/admin/operational-report";

function assertCondition(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

async function main() {
	const report = await buildAdminOperationalReport({
		now: new Date("2026-06-04T00:00:00.000Z"),
	});
	const expectedHeader =
		"section_slug,section_title,status,status_label,detail_href,metric_label,metric_value,metric_helper,last_checked_at";
	const lines = report.content.split("\n");
	const body = lines.slice(1).join("\n");

	assertCondition(
		report.content.startsWith(expectedHeader),
		"El informe operativo M7 no contiene la cabecera CSV esperada",
	);
	assertCondition(
		report.contentType === "text/csv; charset=utf-8",
		"El informe operativo M7 no declara content type CSV",
	);
	assertCondition(
		report.fileName === "kinestilistas-m7-operational-report-2026-06-04.csv",
		"El informe operativo M7 no genera un nombre de fichero estable",
	);
	assertCondition(
		report.summary.total === 5,
		"El informe operativo M7 debe partir de cinco bloques",
	);
	assertCondition(
		report.rowCount >= report.summary.total * 3,
		"El informe operativo M7 no contiene metricas suficientes",
	);

	for (const expectedSlug of [
		"audit-traceability",
		"rate-limit-settings",
		"integration-inventory",
		"support-capabilities",
		"enterprise-operations",
	]) {
		assertCondition(
			body.includes(expectedSlug),
			`El informe operativo M7 no incluye el bloque ${expectedSlug}`,
		);
	}

	console.log("PASS informe operativo M7 genera CSV esperado");
	console.log("PASS informe operativo M7 incluye bloques transversales");
	console.log("PASS informe operativo M7 mantiene resumen consistente");
}

main()
	.then(() => {
		console.log("M7 operations report smoke OK");
	})
	.catch((error) => {
		console.error("M7 operations report smoke FAILED");
		console.error(error);
		process.exitCode = 1;
	});
