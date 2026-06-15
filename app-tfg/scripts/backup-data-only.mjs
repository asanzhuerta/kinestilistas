import "./load-env.cjs";

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const SYSTEM_TABLES = new Set(["migrations", "typeorm_metadata"]);

function quoteIdentifier(identifier) {
	return `"${String(identifier).replaceAll('"', '""')}"`;
}

function quoteLiteral(value) {
	return `'${String(value).replaceAll("'", "''").replaceAll("\u0000", "")}'`;
}

function formatArrayValue(values) {
	return `ARRAY[${values.map(formatValue).join(", ")}]`;
}

function formatValue(value) {
	if (value === null || value === undefined) {
		return "NULL";
	}

	if (Buffer.isBuffer(value)) {
		return `decode('${value.toString("hex")}', 'hex')`;
	}

	if (value instanceof Date) {
		return quoteLiteral(value.toISOString());
	}

	if (Array.isArray(value)) {
		return formatArrayValue(value);
	}

	if (typeof value === "boolean") {
		return value ? "TRUE" : "FALSE";
	}

	if (typeof value === "number") {
		return Number.isFinite(value) ? String(value) : "NULL";
	}

	if (typeof value === "object") {
		return quoteLiteral(JSON.stringify(value));
	}

	return quoteLiteral(value);
}

function sortTablesByDependencies(tables, dependencies) {
	const tableNames = new Set(tables.map((table) => table.name));
	const incoming = new Map(tables.map((table) => [table.name, new Set()]));
	const outgoing = new Map(tables.map((table) => [table.name, new Set()]));

	for (const dependency of dependencies) {
		if (
			dependency.table_name === dependency.foreign_table_name ||
			!tableNames.has(dependency.table_name) ||
			!tableNames.has(dependency.foreign_table_name)
		) {
			continue;
		}

		incoming.get(dependency.table_name)?.add(dependency.foreign_table_name);
		outgoing.get(dependency.foreign_table_name)?.add(dependency.table_name);
	}

	const ready = [...incoming.entries()]
		.filter(([, parents]) => parents.size === 0)
		.map(([tableName]) => tableName)
		.sort();
	const sorted = [];

	while (ready.length > 0) {
		const tableName = ready.shift();
		sorted.push(tableName);

		for (const child of [...(outgoing.get(tableName) ?? [])].sort()) {
			const parents = incoming.get(child);
			parents?.delete(tableName);

			if (parents?.size === 0) {
				ready.push(child);
				ready.sort();
			}
		}
	}

	const sortedSet = new Set(sorted);
	const cyclicOrRemaining = tables
		.map((table) => table.name)
		.filter((tableName) => !sortedSet.has(tableName))
		.sort();

	return [...sorted, ...cyclicOrRemaining];
}

function buildOutputPath() {
	const now = new Date();
	const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\..+/, "");
	const scriptDir = path.dirname(fileURLToPath(import.meta.url));

	return path.resolve(scriptDir, "..", "backups", `data-only-${stamp}.sql`);
}

async function main() {
	if (!process.env.DATABASE_URL) {
		throw new Error("DATABASE_URL no está definido.");
	}

	const client = new Client({
		connectionString: process.env.DATABASE_URL,
	});

	await client.connect();

	try {
		const tablesResult = await client.query(`
			SELECT table_name
			FROM information_schema.tables
			WHERE table_schema = 'public'
				AND table_type = 'BASE TABLE'
			ORDER BY table_name ASC
		`);
		const tables = tablesResult.rows
			.map((row) => ({ name: row.table_name }))
			.filter((table) => !SYSTEM_TABLES.has(table.name));

		const dependenciesResult = await client.query(`
			SELECT
				tc.table_name,
				ccu.table_name AS foreign_table_name
			FROM information_schema.table_constraints tc
			JOIN information_schema.key_column_usage kcu
				ON tc.constraint_name = kcu.constraint_name
				AND tc.table_schema = kcu.table_schema
			JOIN information_schema.constraint_column_usage ccu
				ON ccu.constraint_name = tc.constraint_name
				AND ccu.table_schema = tc.table_schema
			WHERE tc.constraint_type = 'FOREIGN KEY'
				AND tc.table_schema = 'public'
		`);

		const orderedTableNames = sortTablesByDependencies(
			tables,
			dependenciesResult.rows,
		);
		const outputPath = buildOutputPath();
		await fs.mkdir(path.dirname(outputPath), { recursive: true });

		const lines = [
			"-- Kinestilistas data-only backup.",
			"-- Ejecutar después de aplicar las migraciones sobre una base vacía.",
			"-- No contiene CREATE TABLE ni estructura.",
			`-- Generado: ${new Date().toISOString()}`,
			"",
			"BEGIN;",
			"SET session_replication_role = replica;",
			"",
		];

		if (orderedTableNames.length > 0) {
			const truncateTargets = orderedTableNames
				.map((tableName) => quoteIdentifier(tableName))
				.join(", ");
			lines.push(`TRUNCATE TABLE ${truncateTargets} RESTART IDENTITY CASCADE;`, "");
		}

		for (const tableName of orderedTableNames) {
			const rowsResult = await client.query(
				`SELECT * FROM ${quoteIdentifier(tableName)}`,
			);

			lines.push(`-- ${tableName}: ${rowsResult.rowCount} filas`);

			if (rowsResult.rowCount === 0) {
				lines.push("");
				continue;
			}

			const columns = rowsResult.fields.map((field) => field.name);
			const columnsSql = columns.map(quoteIdentifier).join(", ");

			for (const row of rowsResult.rows) {
				const valuesSql = columns
					.map((columnName) => formatValue(row[columnName]))
					.join(", ");
				lines.push(
					`INSERT INTO ${quoteIdentifier(tableName)} (${columnsSql}) VALUES (${valuesSql});`,
				);
			}

			lines.push("");
		}

		lines.push("SET session_replication_role = DEFAULT;", "COMMIT;", "");

		await fs.writeFile(outputPath, lines.join("\n"), "utf8");

		console.log(`Backup de datos generado: ${outputPath}`);
		console.log(`Tablas exportadas: ${orderedTableNames.length}`);
	} finally {
		await client.end();
	}
}

main().catch((error) => {
	console.error("[backup-data-only] error:", error);
	process.exitCode = 1;
});
