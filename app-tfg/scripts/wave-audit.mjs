import "./load-env.cjs";

import fs from "node:fs/promises";
import path from "node:path";

const DEFAULT_BASE_URL = "https://5xkm2q9w-3000.uks1.devtunnels.ms/";
const DEFAULT_PREFLIGHT_TIMEOUT_MS = 8000;
const DEFAULT_ROUTES = [
	"/login",
	"/admin/settings",
	"/admin/catalog/products",
	"/commercials/orders",
	"/commercials/coloration",
	"/clients/orders",
	"/clients/coloration",
];

function parseRoutes() {
	const rawRoutes = String(process.env.WAVE_ROUTES ?? "").trim();

	if (!rawRoutes) {
		return DEFAULT_ROUTES;
	}

	return rawRoutes
		.split(",")
		.map((route) => route.trim())
		.filter(Boolean);
}

function buildTargetUrl(baseUrl, route) {
	const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
	const normalizedRoute = route.startsWith("/") ? route.slice(1) : route;

	return new URL(normalizedRoute, base).toString();
}

function buildWaveReportUrl(targetUrl) {
	return `https://wave.webaim.org/report#/${encodeURI(targetUrl)}`;
}

function shouldSkipIfBaseUnavailable() {
	return String(process.env.WAVE_SKIP_IF_BASE_UNAVAILABLE ?? "true") !== "false";
}

async function checkBaseUrlAvailability(baseUrl) {
	const timeoutMs = Number(
		process.env.WAVE_PREFLIGHT_TIMEOUT_MS ?? DEFAULT_PREFLIGHT_TIMEOUT_MS,
	);
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(baseUrl, {
			method: "GET",
			redirect: "manual",
			signal: controller.signal,
		});

		return {
			available: response.status < 500,
			status: response.status,
			reason:
				response.status < 500
					? null
					: `El endpoint respondio HTTP ${response.status}`,
		};
	} catch (error) {
		return {
			available: false,
			status: null,
			reason:
				error instanceof Error
					? error.message
					: "No se pudo conectar con el endpoint",
		};
	} finally {
		clearTimeout(timeout);
	}
}

async function writeJsonReport(report) {
	const outputPath = path.resolve(
		process.cwd(),
		process.env.WAVE_REPORT_PATH ?? ".codex-artifacts/wave-audit.json",
	);

	await fs.mkdir(path.dirname(outputPath), { recursive: true });
	await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

	return outputPath;
}

async function writeManualChecklist(report) {
	const outputPath = path.resolve(
		process.cwd(),
		process.env.WAVE_CHECKLIST_PATH ?? ".codex-artifacts/wave-manual-checklist.md",
	);
	const lines = [
		"# Checklist WAVE manual",
		"",
		`- Generado: ${report.generatedAt}`,
		`- URL base: ${report.baseUrl}`,
		`- Estado preflight: ${report.preflightStatus ?? "sin respuesta"}`,
		"",
		"## Criterio de revision",
		"",
		"1. Abrir cada enlace de informe WAVE.",
		"2. Revisar errores, contraste y alertas.",
		"3. Registrar el resultado en la tabla y guardar captura si hay correcciones.",
		"4. Repetir la ruta tras corregir cualquier incidencia.",
		"",
		"| Ruta | Pagina | Informe WAVE | Errores | Contraste | Alertas | Resultado | Evidencia |",
		"| --- | --- | --- | --- | --- | --- | --- | --- |",
		...report.pages.map(
			(page) =>
				`| \`${page.route}\` | [abrir pagina](${page.url}) | [abrir WAVE](${page.waveReportUrl}) |  |  |  | Pendiente |  |`,
		),
		"",
	];

	await fs.mkdir(path.dirname(outputPath), { recursive: true });
	await fs.writeFile(outputPath, lines.join("\n"), "utf8");

	return outputPath;
}

async function main() {
	const baseUrl = String(process.env.WAVE_BASE_URL ?? DEFAULT_BASE_URL).trim();
	const routes = parseRoutes();
	const availability = await checkBaseUrlAvailability(baseUrl);

	if (!availability.available) {
		const reportPath = await writeJsonReport({
			generatedAt: new Date().toISOString(),
			mode: "manual",
			baseUrl,
			pages: [],
			ok: true,
			skipped: true,
			skipReason: availability.reason,
			preflightStatus: availability.status,
		});
		const message = `WAVE manual SKIPPED: ${baseUrl} no esta accesible (${availability.reason}). Informe: ${reportPath}`;

		if (shouldSkipIfBaseUnavailable()) {
			console.warn(message);
			return;
		}

		throw new Error(message);
	}

	const pages = routes.map((route) => {
		const url = buildTargetUrl(baseUrl, route);

		return {
			route,
			url,
			waveReportUrl: buildWaveReportUrl(url),
			status: "pending_manual_review",
		};
	});
	const report = {
		generatedAt: new Date().toISOString(),
		mode: "manual",
		baseUrl,
		pages,
		ok: true,
		skipped: false,
		preflightStatus: availability.status,
	};
	const [reportPath, checklistPath] = await Promise.all([
		writeJsonReport(report),
		writeManualChecklist(report),
	]);

	for (const page of pages) {
		console.log(`${page.route}: ${page.waveReportUrl}`);
	}

	console.log(`WAVE manual checklist OK: ${checklistPath}`);
	console.log(`Informe tecnico: ${reportPath}`);
}

main().catch((error) => {
	console.error("[wave-audit] error:", error.message || error);
	process.exitCode = 1;
});
