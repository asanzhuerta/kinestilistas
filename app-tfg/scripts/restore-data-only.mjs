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

function splitSqlList(value) {
	const items = [];
	let current = "";
	let inString = false;

	for (let index = 0; index < value.length; index += 1) {
		const character = value[index];
		const nextCharacter = value[index + 1];

		if (character === "'") {
			current += character;

			if (inString && nextCharacter === "'") {
				current += nextCharacter;
				index += 1;
				continue;
			}

			inString = !inString;
			continue;
		}

		if (character === "," && !inString) {
			items.push(current.trim());
			current = "";
			continue;
		}

		current += character;
	}

	if (current.trim()) {
		items.push(current.trim());
	}

	return items;
}

function normalizeColumnName(value) {
	return value.trim().replace(/^"|"$/g, "").replaceAll('""', '"');
}

function rewriteProductSubcategoryInsert(line, parentUpdates) {
	const match = line.match(
		/^INSERT INTO "product_subcategories" \((.+)\) VALUES \((.+)\);$/,
	);

	if (!match) {
		return line;
	}

	const columns = splitSqlList(match[1]).map(normalizeColumnName);
	const values = splitSqlList(match[2]);
	const idIndex = columns.indexOf("id");
	const parentIndex = columns.indexOf("parent_subcategory_id");

	if (idIndex < 0 || parentIndex < 0) {
		return line;
	}

	const parentValue = values[parentIndex];

	if (!parentValue || parentValue.toUpperCase() === "NULL") {
		return line;
	}

	const idValue = values[idIndex];
	values[parentIndex] = "NULL";
	parentUpdates.push(
		`UPDATE "product_subcategories" SET "parent_subcategory_id" = ${parentValue} WHERE "id" = ${idValue};`,
	);

	return `INSERT INTO "product_subcategories" (${match[1]}) VALUES (${values.join(", ")});`;
}

function findCommitLineIndex(lines) {
	for (let index = lines.length - 1; index >= 0; index -= 1) {
		if (/^\s*COMMIT\s*;/i.test(lines[index])) {
			return index;
		}
	}

	return -1;
}

function sanitizeManagedPostgresSql(sql) {
	const parentUpdates = [];
	const lines = sql
		.split(/\r?\n/)
		.filter((line) => !/^\s*SET\s+session_replication_role\s*=/i.test(line))
		.map((line) => rewriteProductSubcategoryInsert(line, parentUpdates));

	if (parentUpdates.length === 0) {
		return lines.join("\n");
	}

	const commitLineIndex = findCommitLineIndex(lines);
	const updateLines = [
		"",
		"-- Restaurar jerarquia de subcategorias tras insertar todas las filas.",
		...parentUpdates,
	];

	if (commitLineIndex >= 0) {
		lines.splice(commitLineIndex, 0, ...updateLines);
	} else {
		lines.push(...updateLines);
	}

	return lines.join("\n");
}

async function main() {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL no esta definido.");
	}

	ensureRestoreConfirmed();

	const backupPath = await resolveBackupPath();
	const rawSql = await fs.readFile(backupPath, "utf8");
	const sql = sanitizeManagedPostgresSql(rawSql);
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
