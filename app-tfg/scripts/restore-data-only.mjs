import "./load-env.cjs";

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

function getBackupDir() {
	const scriptDir = path.dirname(fileURLToPath(import.meta.url));

	return path.resolve(scriptDir, "..", "backups");
}

async function findLatestBackupPath() {
	const backupDir = getBackupDir();
	const entries = await fs.readdir(backupDir, { withFileTypes: true }).catch(() => []);
	const backupNames = entries
		.filter((entry) => entry.isFile())
		.map((entry) => entry.name)
		.filter((name) => /^data-only-\d{8}T\d{6}\.sql$/.test(name))
		.sort()
		.reverse();

	if (backupNames.length === 0) {
		throw new Error(`No hay backups data-only en ${backupDir}`);
	}

	return path.join(backupDir, backupNames[0]);
}

async function resolveBackupPath() {
	const positional = process.argv.find(
		(argument, index) =>
			index > 1 && !argument.startsWith("--") && argument !== "latest",
	);
	const requested = String(process.env.DATA_BACKUP_PATH ?? positional ?? "").trim();

	if (!requested || requested === "latest") {
		return findLatestBackupPath();
	}

	return path.resolve(process.cwd(), requested);
}

function ensureRestoreConfirmed() {
	const confirmed =
		process.argv.includes("--yes") || process.env.CONFIRM_RESTORE === "true";

	if (!confirmed) {
		throw new Error(
			"La restauracion trunca datos. Ejecuta con --yes o CONFIRM_RESTORE=true para confirmar.",
		);
	}
}

async function main() {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL no esta definido.");
	}

	ensureRestoreConfirmed();

	const backupPath = await resolveBackupPath();
	const sql = await fs.readFile(backupPath, "utf8");
	const client = new Client({
		connectionString: process.env.DATABASE_URL,
	});

	await client.connect();

	try {
		await client.query(sql);
		console.log(`Backup de datos restaurado: ${backupPath}`);
	} finally {
		await client.end();
	}
}

main().catch((error) => {
	console.error("[restore-data-only] error:", error.message || error);
	process.exitCode = 1;
});
