import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const nodeBin = process.execPath;

function runScript(scriptName, args = []) {
	const result = spawnSync(nodeBin, [path.join(scriptDir, scriptName), ...args], {
		stdio: "inherit",
		shell: false,
	});

	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

function getRestoreArgument() {
	const restoreIndex = process.argv.indexOf("--restore");

	if (restoreIndex >= 0) {
		return process.argv[restoreIndex + 1] ?? "latest";
	}

	return String(process.env.DEMO_RESTORE_FROM ?? "").trim() || null;
}

async function findLatestBackupPath() {
	const backupDir = path.resolve(scriptDir, "..", "backups");
	const entries = await fs.readdir(backupDir, { withFileTypes: true }).catch(() => []);
	const latestName = entries
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name)
		.filter((name) => /^data-only-\d{8}T\d{6}\.sql$/.test(name))
		.sort()
		.reverse()[0];

	if (!latestName) {
		throw new Error(`No hay backups data-only en ${backupDir}`);
	}

	return path.join(backupDir, latestName);
}

async function main() {
	const restoreArgument = getRestoreArgument();
	const restoreTarget =
		restoreArgument === "latest" ? await findLatestBackupPath() : restoreArgument;

	console.log("Generando backup del estado actual antes de preparar la demo...");
	runScript("backup-data-only.mjs");

	if (!restoreTarget) {
		console.log(
			"No se ha indicado backup base. Preparacion finalizada sin restaurar datos.",
		);
		console.log(
			"Para restaurar un backup: npm run db:prepare-demo -- --restore latest",
		);
		return;
	}

	console.log(`Restaurando datos demo desde: ${restoreTarget}`);
	runScript("restore-data-only.mjs", [restoreTarget, "--yes"]);
	console.log("Datos demo preparados.");
}

main().catch((error) => {
	console.error("[prepare-demo-data] error:", error.message || error);
	process.exitCode = 1;
});
