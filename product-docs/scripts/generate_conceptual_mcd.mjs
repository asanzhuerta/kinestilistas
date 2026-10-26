import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const requireFromApp = createRequire(
	new URL("../../app-tfg/package.json", import.meta.url),
);
const sharp = requireFromApp("sharp");

const rootDir = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"..",
	"..",
);
const mcdDir = path.join(rootDir, "docs", "figures", "UML", "MCD");

const tableStyle =
	"swimlane;fontStyle=0;childLayout=stackLayout;horizontal=1;startSize=30;" +
	"horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;" +
	"collapsible=1;marginBottom=0;whiteSpace=wrap;html=1;fontColor=#000000;";
const rowStyle =
	"text;strokeColor=none;fillColor=none;align=left;verticalAlign=middle;" +
	"spacingLeft=4;spacingRight=4;overflow=hidden;points=[[0,0.5],[1,0.5]];" +
	"portConstraint=eastwest;rotatable=0;whiteSpace=wrap;html=1;fontColor=#000000;";
const edgeStyle =
	"endArrow=block;html=1;rounded=0;strokeWidth=1.2;strokeColor=#666666;";

const modules = [
	{
		code: "M1",
		source: "M1_BD.drawio",
		title: "Acceso, usuarios y auditoría",
		entities: [
			["Usuario", ["id", "email", "passwordHash", "nombre", "teléfono", "empresa", "rol", "estado", "imagenPerfil", "últimoAcceso"]],
			["Rol", ["id", "código", "nombre", "descripción"]],
			["Estado de usuario", ["id", "código", "nombre"]],
			["Solicitud de registro", ["id", "email", "datosSolicitante", "rolSolicitado", "estado", "origen", "fechaSolicitud", "fechaRevision"]],
			["Estado de solicitud", ["id", "código", "nombre"]],
			["Origen de solicitud", ["id", "código", "nombre"]],
			["Registro de gestión", ["id", "usuarioObjetivo", "administrador", "acción", "estadoAnterior", "estadoNuevo", "motivo"]],
			["Tipo de acción administrativa", ["id", "código", "nombre"]],
			["Registro de acceso", ["id", "usuario", "emailIntentado", "tipoEvento", "resultado", "ip", "fecha"]],
			["Tipo de evento de acceso", ["id", "código", "nombre"]],
			["Resultado de acceso", ["id", "código", "nombre"]],
		],
		relations: [
			["Usuario", "Rol"],
			["Usuario", "Estado de usuario"],
			["Solicitud de registro", "Estado de solicitud"],
			["Solicitud de registro", "Origen de solicitud"],
			["Solicitud de registro", "Usuario"],
			["Registro de gestión", "Usuario"],
			["Registro de gestión", "Tipo de acción administrativa"],
			["Registro de acceso", "Usuario"],
			["Registro de acceso", "Tipo de evento de acceso"],
			["Registro de acceso", "Resultado de acceso"],
		],
	},
	{
		code: "M2",
		source: "M2_BD.drawio",
		title: "Clientes, comerciales, visitas y rutas",
		entities: [
			["Cliente profesional", ["id", "usuarioVinculado", "comercialAsignado", "nombre", "contacto", "dirección", "geolocalización", "ventanaVisita", "observaciones"]],
			["Comercial", ["id", "usuario", "código", "zona", "jornada", "capacidadDiaria", "configuraciónRuta"]],
			["Asignación comercial-cliente", ["id", "cliente", "comercial", "fechaAsignacion", "fechaFin", "motivo"]],
			["Visita comercial", ["id", "cliente", "comercial", "tipo", "estado", "fechaPlanificada", "resultado", "observaciones"]],
			["Tipo de visita", ["id", "código", "nombre"]],
			["Estado de visita", ["id", "código", "nombre"]],
			["Ruta comercial", ["id", "comercial", "fecha", "estado", "origen", "destino", "distancia", "duracion"]],
			["Estado de ruta", ["id", "código", "nombre"]],
			["Visita en ruta", ["id", "ruta", "visita", "orden", "eta", "distanciaAcumulada"]],
			["Usuario (M1)", ["id", "email", "rol", "estado"]],
		],
		relations: [
			["Cliente profesional", "Usuario (M1)"],
			["Comercial", "Usuario (M1)"],
			["Asignación comercial-cliente", "Cliente profesional"],
			["Asignación comercial-cliente", "Comercial"],
			["Visita comercial", "Cliente profesional"],
			["Visita comercial", "Comercial"],
			["Visita comercial", "Tipo de visita"],
			["Visita comercial", "Estado de visita"],
			["Ruta comercial", "Comercial"],
			["Ruta comercial", "Estado de ruta"],
			["Visita en ruta", "Ruta comercial"],
			["Visita en ruta", "Visita comercial"],
		],
	},
	{
		code: "M3",
		source: "M3_BD.drawio",
		title: "Catálogo, productos y coloración",
		entities: [
			["Producto", ["id", "nombre", "referencia", "descripción", "categoría", "línea", "subcategoría", "estado", "imagen", "informaciónTécnica"]],
			["Categoría de producto", ["id", "nombre", "descripción", "orden"]],
			["Línea comercial", ["id", "categoría", "nombre", "descripción", "orden"]],
			["Subcategoría de producto", ["id", "línea", "padre", "nombre", "descripción", "orden"]],
			["Estado de producto", ["id", "código", "nombre"]],
			["Recurso de apoyo", ["id", "título", "tipo", "producto", "url", "descripción"]],
			["Tipo de recurso", ["id", "código", "nombre"]],
			["Carta de color", ["id", "nombre", "descripción", "línea", "imagen"]],
			["Referencia de color", ["id", "carta", "código", "nombre", "tono", "orden"]],
		],
		relations: [
			["Producto", "Categoría de producto"],
			["Producto", "Línea comercial"],
			["Producto", "Subcategoría de producto"],
			["Producto", "Estado de producto"],
			["Línea comercial", "Categoría de producto"],
			["Subcategoría de producto", "Línea comercial"],
			["Subcategoría de producto", "Subcategoría de producto"],
			["Recurso de apoyo", "Producto"],
			["Recurso de apoyo", "Tipo de recurso"],
			["Carta de color", "Línea comercial"],
			["Referencia de color", "Carta de color"],
		],
	},
	{
		code: "M4",
		source: "M4_BD.drawio",
		title: "Pedidos, reparto y cobro",
		entities: [
			["Pedido", ["id", "cliente", "comercial", "estado", "estadoCobro", "importe", "fechaConfirmacion", "fechaEntrega", "qrEntrega"]],
			["Línea de pedido", ["id", "pedido", "producto", "referenciaColor", "cantidad", "precio"]],
			["Estado de pedido", ["id", "código", "nombre"]],
			["Estado de cobro", ["id", "código", "nombre"]],
			["Visita comercial (M2)", ["id", "cliente", "comercial", "tipo", "estado", "fechaPlanificada"]],
			["Cliente profesional (M2)", ["id", "nombre", "dirección", "geolocalización"]],
			["Comercial (M2)", ["id", "usuario", "zona"]],
			["Producto (M3)", ["id", "nombre", "referencia", "estado"]],
			["Referencia de color (M3)", ["id", "código", "nombre", "carta"]],
		],
		relations: [
			["Pedido", "Cliente profesional (M2)"],
			["Pedido", "Comercial (M2)"],
			["Pedido", "Estado de pedido"],
			["Pedido", "Estado de cobro"],
			["Pedido", "Visita comercial (M2)"],
			["Línea de pedido", "Pedido"],
			["Línea de pedido", "Producto (M3)"],
			["Línea de pedido", "Referencia de color (M3)"],
		],
	},
	{
		code: "M5",
		source: "M5_DB.drawio",
		title: "Gestión técnica del salón",
		entities: [
			["Cliente del salón", ["id", "clienteProfesional", "nombre", "teléfono", "email", "observaciones"]],
			["Servicio realizado", ["id", "clienteSalón", "fecha", "tipo", "descripción", "resultado", "observaciones"]],
			["Ficha técnica", ["id", "servicio", "diagnostico", "formula", "tiempoExposicion", "tono", "observaciones"]],
			["Producto utilizado", ["id", "servicio", "producto", "referenciaColor", "cantidad", "uso"]],
			["Imagen de resultado", ["id", "servicio", "url", "descripción", "orden"]],
			["Plantilla de servicio", ["id", "clienteProfesional", "nombre", "descripción", "configuración"]],
			["Producto de plantilla", ["id", "plantilla", "producto", "cantidad", "uso"]],
			["Sugerencia de producto", ["id", "clienteSalon", "producto", "motivo", "prioridad"]],
			["Correo técnico generado", ["id", "servicio", "destinatario", "asunto", "contenido", "fechaGeneracion"]],
			["Cliente profesional (M2)", ["id", "nombre", "usuarioVinculado"]],
			["Producto (M3)", ["id", "nombre", "referencia", "estado"]],
			["Referencia de color (M3)", ["id", "código", "nombre"]],
		],
		relations: [
			["Cliente del salón", "Cliente profesional (M2)"],
			["Servicio realizado", "Cliente del salón"],
			["Ficha técnica", "Servicio realizado"],
			["Producto utilizado", "Servicio realizado"],
			["Producto utilizado", "Producto (M3)"],
			["Producto utilizado", "Referencia de color (M3)"],
			["Imagen de resultado", "Servicio realizado"],
			["Plantilla de servicio", "Cliente profesional (M2)"],
			["Producto de plantilla", "Plantilla de servicio"],
			["Producto de plantilla", "Producto (M3)"],
			["Sugerencia de producto", "Cliente del salón"],
			["Sugerencia de producto", "Producto (M3)"],
			["Correo técnico generado", "Servicio realizado"],
		],
	},
	{
		code: "M6",
		source: "M6_BD.drawio",
		title: "Comunicaciones, promociones y formación",
		entities: [
			["Promoción", ["id", "título", "descripción", "tipo", "beneficio", "estado", "vigencia", "segmento"]],
			["Segmento de cliente", ["id", "código", "nombre", "criterio", "descripción"]],
			["Asignación de segmento", ["id", "cliente", "segmento", "fechaAsignacion", "origen"]],
			["Producto promocionado", ["id", "promoción", "producto", "condición"]],
			["Notificación interna", ["id", "destinatario", "título", "mensaje", "tipo", "canal", "estadoLectura"]],
			["Recordatorio", ["id", "usuario", "título", "mensaje", "fechaProgramada", "estado"]],
			["Formación", ["id", "título", "descripción", "fecha", "ubicación", "modalidad", "estado", "aforo"]],
			["Inscripción a formación", ["id", "formacion", "usuario", "estado", "fechaRegistro", "observaciones"]],
			["Suscripción push", ["id", "usuario", "endpoint", "claves", "estado", "ultimoUso"]],
			["Cliente profesional (M2)", ["id", "nombre", "comercialAsignado"]],
			["Usuario (M1)", ["id", "email", "rol", "estado"]],
			["Producto (M3)", ["id", "nombre", "referencia"]],
			["Integración externa (M7)", ["id", "nombre", "tipo", "estado"]],
		],
		relations: [
			["Promoción", "Segmento de cliente"],
			["Producto promocionado", "Promoción"],
			["Producto promocionado", "Producto (M3)"],
			["Asignación de segmento", "Cliente profesional (M2)"],
			["Asignación de segmento", "Segmento de cliente"],
			["Notificación interna", "Usuario (M1)"],
			["Recordatorio", "Usuario (M1)"],
			["Formación", "Integración externa (M7)"],
			["Inscripción a formación", "Formación"],
			["Inscripción a formación", "Usuario (M1)"],
			["Suscripción push", "Usuario (M1)"],
		],
	},
	{
		code: "M7",
		source: "M7_DB.drawio",
		title: "Administración técnica e integraciones",
		entities: [
			["Configuración del sistema", ["id", "clave", "valor", "tipo", "ámbito", "fechaActualización"]],
			["Política de limitación", ["id", "ámbito", "límite", "ventana", "estado", "descripción"]],
			["Integración externa", ["id", "nombre", "tipo", "estado", "configuración", "últimoChequeo"]],
			["Operación de integración", ["id", "integracion", "tipoOperacion", "tipoDato", "estado", "payload", "resultado"]],
			["Propuesta a proveedor", ["id", "proveedor", "estado", "criterio", "importeEstimado", "fechaGeneracion"]],
			["Línea de propuesta", ["id", "propuesta", "producto", "cantidad", "motivo"]],
			["Usuario (M1)", ["id", "email", "rol", "estado"]],
			["Producto (M3)", ["id", "nombre", "referencia", "stockEstimado"]],
		],
		relations: [
			["Operación de integración", "Integración externa"],
			["Propuesta a proveedor", "Integración externa"],
			["Línea de propuesta", "Propuesta a proveedor"],
			["Línea de propuesta", "Producto (M3)"],
			["Configuración del sistema", "Usuario (M1)"],
			["Política de limitación", "Usuario (M1)"],
		],
	},
	{
		code: "M8",
		source: "M8_DB.drawio",
		title: "Funcionalidades inteligentes previstas",
		entities: [
			["Consulta de recomendación", ["id", "usuario", "clienteSalon", "tipoCabello", "estadoCabello", "tratamientosPrevios", "observaciones"]],
			["Recomendación de tratamiento", ["id", "consulta", "producto", "descripción", "prioridad", "motivo"]],
			["Simulación de coloración", ["id", "usuario", "imagenOrigen", "cambioSolicitado", "resultado", "fechaCreacion"]],
			["Reconocimiento de producto", ["id", "usuario", "imagen", "codigoDetectado", "producto", "proposito", "fecha"]],
			["Reserva online", ["id", "clienteProfesional", "clienteSalon", "nombre", "contacto", "servicio", "fecha", "estado"]],
			["Estado de reserva", ["id", "código", "nombre"]],
			["Propósito de reconocimiento", ["id", "código", "nombre"]],
			["Usuario (M1)", ["id", "email", "rol", "estado"]],
			["Cliente profesional (M2)", ["id", "nombre", "contacto"]],
			["Cliente del salón (M5)", ["id", "nombre", "teléfono"]],
			["Producto (M3)", ["id", "nombre", "referencia"]],
		],
		relations: [
			["Consulta de recomendación", "Usuario (M1)"],
			["Consulta de recomendación", "Cliente del salón (M5)"],
			["Recomendación de tratamiento", "Consulta de recomendación"],
			["Recomendación de tratamiento", "Producto (M3)"],
			["Simulación de coloración", "Usuario (M1)"],
			["Reconocimiento de producto", "Usuario (M1)"],
			["Reconocimiento de producto", "Producto (M3)"],
			["Reconocimiento de producto", "Propósito de reconocimiento"],
			["Reserva online", "Cliente profesional (M2)"],
			["Reserva online", "Cliente del salón (M5)"],
			["Reserva online", "Estado de reserva"],
		],
	},
];

function escapeXml(value) {
	return value
		.replace(/&/g, "&amp;")
		.replace(/"/g, "&quot;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function slug(value) {
	return value
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.replace(/[^a-zA-Z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.toLowerCase();
}

function layoutEntities(entities) {
	const count = entities.length;
	const columns = count <= 9 ? 3 : 4;
	const cellWidth = 245;
	const gapX = 85;
	const gapY = 80;
	const startX = 70;
	const startY = 80;

	return entities.map(([name, attributes], index) => {
		const col = index % columns;
		const row = Math.floor(index / columns);
		const height = 34 + attributes.length * 22;
		return {
			name,
			attributes,
			id: `entity-${slug(name)}`,
			x: startX + col * (cellWidth + gapX),
			y: startY + row * (220 + gapY),
			width: cellWidth,
			height,
		};
	});
}

function buildDrawio(module) {
	const entities = layoutEntities(module.entities);
	const byName = new Map(entities.map((entity) => [entity.name, entity]));
	const cells = [
		'<mxCell id="0"/>',
		'<mxCell id="1" parent="0"/>',
	];

	for (const entity of entities) {
		cells.push(
			`<mxCell id="${entity.id}" value="${escapeXml(entity.name)}" style="${tableStyle}" parent="1" vertex="1"><mxGeometry x="${entity.x}" y="${entity.y}" width="${entity.width}" height="${entity.height}" as="geometry"/></mxCell>`,
		);
		entity.attributes.forEach((attribute, index) => {
			cells.push(
				`<mxCell id="${entity.id}-a${index}" value="${escapeXml(attribute)}" style="${rowStyle}" parent="${entity.id}" vertex="1"><mxGeometry y="${30 + index * 22}" width="${entity.width}" height="22" as="geometry"/></mxCell>`,
			);
		});
	}

	module.relations.forEach(([from, to], index) => {
		const source = byName.get(from);
		const target = byName.get(to);
		if (!source || !target) return;
		cells.push(
			`<mxCell id="rel-${index}" value="" style="${edgeStyle}" parent="1" source="${source.id}" target="${target.id}" edge="1"><mxGeometry relative="1" as="geometry"/></mxCell>`,
		);
	});

	return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="codex-generated">
  <diagram name="${module.code} - Modelo conceptual de datos" id="${module.code.toLowerCase()}-mcd-conceptual">
    <mxGraphModel dx="1600" dy="1200" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1200" pageHeight="900" math="0" shadow="0">
      <root>
        ${cells.join("\n        ")}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>
`;
}

function svgText(text, x, y, options = {}) {
	const attrs = [
		`x="${x}"`,
		`y="${y}"`,
		`font-family="Arial, sans-serif"`,
		`font-size="${options.size ?? 12}"`,
		`fill="${options.fill ?? "#222"}"`,
	];
	if (options.weight) attrs.push(`font-weight="${options.weight}"`);
	if (options.anchor) attrs.push(`text-anchor="${options.anchor}"`);
	return `<text ${attrs.join(" ")}>${escapeXml(text)}</text>`;
}

function renderSvg(module) {
	const entities = layoutEntities(module.entities);
	const byName = new Map(entities.map((entity) => [entity.name, entity]));
	const maxX = Math.max(...entities.map((entity) => entity.x + entity.width)) + 70;
	const maxY = Math.max(...entities.map((entity) => entity.y + entity.height)) + 70;

	const lines = module.relations
		.map(([from, to]) => {
			const source = byName.get(from);
			const target = byName.get(to);
			if (!source || !target) return "";
			const x1 = source.x + source.width / 2;
			const y1 = source.y + source.height / 2;
			const x2 = target.x + target.width / 2;
			const y2 = target.y + target.height / 2;
			return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#666" stroke-width="1.3" marker-end="url(#arrow)" opacity="0.72"/>`;
		})
		.join("\n");

	const boxes = entities
		.map((entity) => {
			const rows = entity.attributes
				.map((attribute, index) => {
					const y = entity.y + 30 + index * 22;
					return `
						<line x1="${entity.x}" y1="${y}" x2="${entity.x + entity.width}" y2="${y}" stroke="#d5d5d5" stroke-width="1"/>
						${svgText(attribute, entity.x + 8, y + 15, { size: 11 })}
					`;
				})
				.join("\n");
			return `
				<g>
					<rect x="${entity.x}" y="${entity.y}" width="${entity.width}" height="${entity.height}" fill="#ffffff" stroke="#333333" stroke-width="1.2"/>
					<rect x="${entity.x}" y="${entity.y}" width="${entity.width}" height="30" fill="#f5f5f5" stroke="#333333" stroke-width="1.2"/>
					${svgText(entity.name, entity.x + entity.width / 2, entity.y + 20, { size: 12, weight: 700, anchor: "middle", fill: "#111" })}
					${rows}
				</g>
			`;
		})
		.join("\n");

	return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${maxX}" height="${maxY}" viewBox="0 0 ${maxX} ${maxY}">
	<defs>
		<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
			<path d="M 0 0 L 10 5 L 0 10 z" fill="#666"/>
		</marker>
	</defs>
	<rect width="${maxX}" height="${maxY}" fill="#ffffff"/>
	${svgText(`${module.code} - ${module.title}`, 48, 38, { size: 20, weight: 700, fill: "#111" })}
	${lines}
	${boxes}
</svg>`;
}

for (const module of modules) {
	const sourcePath = path.join(mcdDir, module.source);
	if (!fs.existsSync(sourcePath)) {
		throw new Error(`No se encuentra el diagrama físico base: ${sourcePath}`);
	}

	const outputBase = path.join(mcdDir, `${module.code}_MCD_conceptual`);
	const drawio = buildDrawio(module);
	const svg = renderSvg(module);

	fs.writeFileSync(`${outputBase}.drawio`, drawio, "utf8");
	fs.writeFileSync(`${outputBase}.svg`, svg, "utf8");
	await sharp(Buffer.from(svg)).png().toFile(`${outputBase}.png`);

	console.log(`Generated ${path.basename(outputBase)}.drawio/.svg/.png`);
}
