import { getAdminOperationalOverview } from "@/lib/admin/operational-overview";

function assertCondition(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

async function main() {
	const overview = await getAdminOperationalOverview(
		new Date("2026-06-04T00:00:00.000Z"),
	);
	const slugs = new Set(overview.sections.map((section) => section.slug));

	assertCondition(
		overview.sections.length === 5,
		"M7 debe resumir cinco bloques operativos",
	);
	assertCondition(
		slugs.size === overview.sections.length,
		"Los bloques operativos de M7 no deben tener slugs duplicados",
	);

	for (const expectedSlug of [
		"audit-traceability",
		"rate-limit-settings",
		"integration-inventory",
		"support-capabilities",
		"enterprise-operations",
	]) {
		assertCondition(
			slugs.has(expectedSlug),
			`Falta el bloque operativo esperado ${expectedSlug}`,
		);
	}

	for (const section of overview.sections) {
		assertCondition(
			section.href.startsWith("/admin/"),
			`El bloque ${section.slug} no enlaza a un detalle admin`,
		);
		assertCondition(
			section.statusLabel.length > 0,
			`El bloque ${section.slug} no tiene etiqueta de estado`,
		);
		assertCondition(
			section.metrics.length >= 3,
			`El bloque ${section.slug} no expone metricas suficientes`,
		);
	}

	assertCondition(
		overview.summary.total === overview.sections.length,
		"El resumen operativo no coincide con las secciones",
	);
	assertCondition(
		overview.summary.ready + overview.summary.warning + overview.summary.attention ===
			overview.summary.total,
		"El resumen de estados operativos de M7 no cuadra",
	);

	console.log("PASS resumen M7 contiene bloques operativos esperados");
	console.log("PASS cada bloque enlaza detalle y expone metricas");
	console.log("PASS resumen agregado de operacion M7 consistente");
}

main()
	.then(() => {
		console.log("M7 operations smoke OK");
	})
	.catch((error) => {
		console.error("M7 operations smoke FAILED");
		console.error(error);
		process.exitCode = 1;
	});
