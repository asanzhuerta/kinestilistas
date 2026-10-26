import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const requireFromApp = createRequire(new URL("../../app-tfg/package.json", import.meta.url));
const sharp = requireFromApp("sharp");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const outputDir = path.join(rootDir, "docs", "figures", "UML", "MCD");

const width = 1800;
const height = 1180;

const modules = [
	{
		x: 60,
		y: 130,
		w: 390,
		h: 310,
		code: "M1",
		title: "Acceso, usuarios y auditoria",
		lines: [
			"users, roles, user_statuses",
			"registration_requests",
			"user_access_logs",
			"user_management_logs",
			"administrative action catalogs",
		],
	},
	{
		x: 500,
		y: 130,
		w: 390,
		h: 310,
		code: "M2",
		title: "Clientes, visitas y rutas",
		lines: [
			"clients, commercials",
			"commercial_client_assignments",
			"commercial_visits",
			"commercial_routes",
			"commercial_route_stops",
			"persisted ETA and route metadata",
		],
	},
	{
		x: 940,
		y: 130,
		w: 390,
		h: 310,
		code: "M3",
		title: "Catálogo y coloración",
		lines: [
			"products",
			"product_categories, product_lines",
			"product_subcategories",
			"color_charts",
			"color_references",
			"support_resources",
		],
	},
	{
		x: 1370,
		y: 130,
		w: 370,
		h: 500,
		code: "M4",
		title: "Pedidos, repartos y pagos",
		lines: [
			"orders",
			"- client_id, commercial_id",
			"- status_id, payment_status_id",
			"- fulfillment_method, agency_fee",
			"order_lines",
			"- product_id, color_reference_id",
			"order_deliveries",
			"- order_id, visit_id, type",
			"- package_count, qr_payload",
			"order_delivery_lines",
			"- delivery_id, order_line_id, quantity",
			"order_payments",
			"- amount, method, paid_at, notes",
		],
	},
	{
		x: 60,
		y: 520,
		w: 390,
		h: 330,
		code: "M5",
		title: "Salón técnico",
		lines: [
			"salon_clients",
			"salon_services",
			"salon_service_products",
			"salon_service_images",
			"salon_service_templates",
			"technical drafts and formulas",
		],
	},
	{
		x: 500,
		y: 520,
		w: 390,
		h: 330,
		code: "M6",
		title: "Comunicaciones",
		lines: [
			"promotions",
			"promotion_products",
			"customer_segments and tiers",
			"app_notifications",
			"training_events",
			"push_subscriptions",
			"delivery channel settings",
		],
	},
	{
		x: 940,
		y: 520,
		w: 390,
		h: 330,
		code: "M7",
		title: "Configuración e integraciones",
		lines: [
			"system_configurations",
			"- agency_delivery_fee",
			"rate_limit_policies",
			"enterprise_integrations",
			"enterprise_operations",
			"supplier_order_proposals",
		],
	},
	{
		x: 1370,
		y: 700,
		w: 370,
		h: 360,
		code: "REL",
		title: "Relaciones clave",
		lines: [
			"clients -> orders",
			"commercials -> orders",
			"orders -> order_lines",
			"orders -> order_deliveries",
			"order_deliveries -> commercial_visits",
			"order_deliveries -> order_delivery_lines",
			"orders -> order_payments",
			"system_configurations -> agency fee",
		],
	},
];

const relations = [
	[255, 440, 1555, 130, "cliente/comercial"],
	[1135, 440, 1555, 130, "producto/color"],
	[1555, 630, 1555, 700, "estado logistico"],
	[1135, 700, 1370, 880, "cargo agencia"],
	[695, 700, 1370, 940, "notificaciones"],
];

const escapeXml = (value) =>
	String(value)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");

const renderModule = (module) => {
	const lines = module.lines
		.map((line, index) => {
			const isNested = line.startsWith("-");
			const x = module.x + (isNested ? 44 : 28);
			const y = module.y + 92 + index * 26;
			const className = isNested ? "nested-line" : "module-line";
			return `<text x="${x}" y="${y}" class="${className}">${escapeXml(line)}</text>`;
		})
		.join("\n");

	return `
<g>
	<rect x="${module.x}" y="${module.y}" width="${module.w}" height="${module.h}" rx="18" class="module-box"/>
	<rect x="${module.x + 22}" y="${module.y + 22}" width="56" height="40" rx="12" class="module-code-box"/>
	<text x="${module.x + 50}" y="${module.y + 49}" text-anchor="middle" class="module-code">${escapeXml(module.code)}</text>
	<text x="${module.x + 92}" y="${module.y + 48}" class="module-title">${escapeXml(module.title)}</text>
	${lines}
</g>`;
};

const renderRelation = ([x1, y1, x2, y2, label]) => `
<path d="M ${x1} ${y1} C ${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2} ${y2}" class="connector"/>
<text x="${(x1 + x2) / 2 - 48}" y="${(y1 + y2) / 2 - 12}" class="connector-label">${escapeXml(label)}</text>`;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
<style>
	.bg { fill: #f8fafc; }
	.title { font: 700 38px Arial, sans-serif; fill: #0f172a; letter-spacing: 4px; }
	.subtitle { font: 400 21px Arial, sans-serif; fill: #475569; letter-spacing: 0.5px; }
	.module-box { fill: #ffffff; stroke: #cbd5e1; stroke-width: 2.2; filter: drop-shadow(0 10px 16px rgba(15, 23, 42, 0.10)); }
	.module-code-box { fill: #020617; }
	.module-code { font: 700 18px Arial, sans-serif; fill: #ffffff; }
	.module-title { font: 700 20px Arial, sans-serif; fill: #111827; }
	.module-line { font: 500 17px Arial, sans-serif; fill: #24324a; }
	.nested-line { font: 400 15px Arial, sans-serif; fill: #475569; }
	.connector { fill: none; stroke: #0f766e; stroke-width: 3; stroke-dasharray: 10 8; opacity: 0.64; }
	.connector-label { font: 700 14px Arial, sans-serif; fill: #0f766e; }
</style>
<rect width="${width}" height="${height}" class="bg"/>
<text x="60" y="58" class="title">MODELO FISICO POSTGRESQL</text>
<text x="60" y="94" class="subtitle">Resumen verificable de entidades persistentes por módulo y relaciones clave del flujo de pedidos.</text>
${relations.map(renderRelation).join("\n")}
${modules.map(renderModule).join("\n")}
</svg>`;

fs.mkdirSync(outputDir, { recursive: true });
const svgPath = path.join(outputDir, "postgresql-physical-model.svg");
const pngPath = path.join(outputDir, "postgresql-physical-model.png");
fs.writeFileSync(svgPath, svg, "utf8");
await sharp(Buffer.from(svg)).png().toFile(pngPath);

console.log(`Generated ${path.relative(rootDir, svgPath)}`);
console.log(`Generated ${path.relative(rootDir, pngPath)}`);
