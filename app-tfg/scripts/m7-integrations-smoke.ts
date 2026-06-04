import {
	listIntegrationStatusItems,
	summarizeIntegrationStatusItems,
} from "@/lib/integrations/operational-status";

function assertCondition(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

function main() {
	const items = listIntegrationStatusItems(new Date("2026-06-04T00:00:00.000Z"));
	const summary = summarizeIntegrationStatusItems(items);
	const slugs = new Set(items.map((item) => item.slug));

	assertCondition(items.length === 4, "M7 debe listar cuatro integraciones");
	assertCondition(
		slugs.size === items.length,
		"Las integraciones de M7 no deben tener slugs duplicados",
	);

	for (const expectedSlug of [
		"cloudinary-images",
		"geocoding-nominatim",
		"routing-osrm",
		"order-qr-quickchart",
	]) {
		assertCondition(
			slugs.has(expectedSlug),
			`Falta la integracion esperada ${expectedSlug}`,
		);
	}

	for (const item of items) {
		assertCondition(
			item.statusLabel.length > 0,
			`La integracion ${item.slug} no tiene etiqueta de estado`,
		);
		assertCondition(
			item.configuration.length > 0,
			`La integracion ${item.slug} no expone configuracion`,
		);
		assertCondition(
			item.operationalUse.length > 0 && item.fallbackBehavior.length > 0,
			`La integracion ${item.slug} no documenta uso o degradacion`,
		);
	}

	assertCondition(
		summary.total === items.length,
		"El resumen de integraciones no coincide con el listado",
	);
	assertCondition(
		summary.operational + summary.degraded + summary.notConfigured ===
			summary.total,
		"El resumen de estados de M7 no cuadra",
	);

	console.log("PASS inventario M7 contiene integraciones esperadas");
	console.log("PASS cada integracion expone estado, configuracion y fallback");
	console.log("PASS resumen operativo de M7 consistente");
}

try {
	main();
	console.log("M7 integrations smoke OK");
} catch (error) {
	console.error("M7 integrations smoke FAILED");
	console.error(error);
	process.exitCode = 1;
}
