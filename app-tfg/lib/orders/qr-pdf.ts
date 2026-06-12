import sharp from "sharp";
import type { OrderDeliverySummary, OrderSummary } from "@/lib/contracts/order";
import {
	buildOrderDeliveryQrImageUrl,
	buildOrderDeliveryQrPayload,
	buildOrderQrImageUrl,
	buildOrderQrPayload,
} from "@/lib/orders/qr";

const A6_PORTRAIT_WIDTH = 298;
const A6_PORTRAIT_HEIGHT = 420;
const A6_LANDSCAPE_WIDTH = 420;
const A6_LANDSCAPE_HEIGHT = 298;

function normalizePdfText(value: string | number | null | undefined) {
	return String(value ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^\x20-\x7E]/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

function escapePdfText(value: string | number | null | undefined) {
	return normalizePdfText(value).replace(/[\\()]/g, "\\$&");
}

function truncateText(value: string, maxLength: number) {
	const normalizedValue = normalizePdfText(value);

	return normalizedValue.length > maxLength
		? `${normalizedValue.slice(0, Math.max(maxLength - 3, 0))}...`
		: normalizedValue;
}

function fitTextToWidth(
	value: string | number | null | undefined,
	input: {
		maxWidth: number;
		size: number;
	},
) {
	const normalizedValue = normalizePdfText(value);
	const averageGlyphWidth = input.size * 0.56;
	const maxLength = Math.max(
		1,
		Math.floor(input.maxWidth / averageGlyphWidth),
	);

	return truncateText(normalizedValue, maxLength);
}

function formatDateLabel(value: string | null | undefined) {
	const parsed = new Date(String(value ?? ""));

	if (Number.isNaN(parsed.getTime())) {
		return "-";
	}

	return new Intl.DateTimeFormat("es-ES", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(parsed);
}

function buildPdfBuffer(input: {
	imageBuffer: Buffer;
	imageWidth: number;
	imageHeight: number;
	contentStream: string;
	pageWidth?: number;
	pageHeight?: number;
}) {
	const chunks: Buffer[] = [];
	const offsets: number[] = [];
	let currentOffset = 0;

	const pageWidth = input.pageWidth ?? A6_PORTRAIT_WIDTH;
	const pageHeight = input.pageHeight ?? A6_PORTRAIT_HEIGHT;

	function write(value: string | Buffer) {
		const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value, "binary");
		chunks.push(buffer);
		currentOffset += buffer.length;
	}

	function writeObject(id: number, value: string | Buffer) {
		offsets[id] = currentOffset;
		write(`${id} 0 obj\n`);
		write(value);
		write("\nendobj\n");
	}

	write("%PDF-1.4\n");

	writeObject(
		1,
		"<< /Type /Catalog /Pages 2 0 R >>",
	);
	writeObject(
		2,
		"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
	);
	writeObject(
		3,
		`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R /F2 7 0 R >> /XObject << /Im1 5 0 R >> >> /Contents 6 0 R >>`,
	);
	writeObject(
		4,
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
	);
	writeObject(
		7,
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
	);

	offsets[5] = currentOffset;
	write("5 0 obj\n");
	write(
		`<< /Type /XObject /Subtype /Image /Width ${input.imageWidth} /Height ${input.imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${input.imageBuffer.length} >>\nstream\n`,
	);
	write(input.imageBuffer);
	write("\nendstream\nendobj\n");

	const contentBuffer = Buffer.from(input.contentStream, "binary");
	writeObject(
		6,
		`<< /Length ${contentBuffer.length} >>\nstream\n${input.contentStream}\nendstream`,
	);

	const xrefOffset = currentOffset;
	write(`xref\n0 8\n`);
	write("0000000000 65535 f \n");
	for (let id = 1; id <= 7; id += 1) {
		write(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
	}
	write(
		`trailer\n<< /Size 8 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
	);

	return Buffer.concat(chunks);
}

function textLine(input: {
	x: number;
	y: number;
	size: number;
	text: string | number | null | undefined;
	font?: "F1" | "F2";
	maxWidth?: number;
}) {
	const text =
		typeof input.maxWidth === "number"
			? fitTextToWidth(input.text, {
					maxWidth: input.maxWidth,
					size: input.size,
				})
			: input.text;

	return `BT /${input.font ?? "F1"} ${input.size} Tf ${input.x} ${input.y} Td (${escapePdfText(text)}) Tj ET`;
}

export async function buildOrderQrPdf(order: OrderSummary) {
	const qrResponse = await fetch(buildOrderQrImageUrl(order.id));

	if (!qrResponse.ok) {
		throw new Error("No se pudo generar la imagen QR del pedido.");
	}

	const qrPngBuffer = Buffer.from(await qrResponse.arrayBuffer());
	const qrJpegBuffer = await sharp(qrPngBuffer)
		.resize(900, 900, {
			fit: "contain",
			background: "#ffffff",
		})
		.flatten({ background: "#ffffff" })
		.jpeg({ quality: 92 })
		.toBuffer();
	const metadata = await sharp(qrJpegBuffer).metadata();
	const qrPayload = buildOrderQrPayload(order.id);
	const orderIdLabel = order.id.slice(0, 8).toUpperCase();
	const clientName = truncateText(order.client_name, 34);
	const createdAt = formatDateLabel(order.created_at);
	const contentStream = [
		"0.97 0.97 0.97 rg",
		"18 18 262 384 re f",
		"0.87 0.89 0.92 RG",
		"18 18 262 384 re S",
		"0 0 0 rg",
		"BT /F1 10 Tf 34 376 Td (KINESTILISTAS) Tj ET",
		`BT /F1 20 Tf 34 350 Td (PEDIDO ${escapePdfText(orderIdLabel)}) Tj ET`,
		`BT /F1 10 Tf 34 331 Td (Cliente: ${escapePdfText(clientName)}) Tj ET`,
		`BT /F1 9 Tf 34 315 Td (Fecha: ${escapePdfText(createdAt)}) Tj ET`,
		"q",
		"210 0 0 210 44 92 cm",
		"/Im1 Do",
		"Q",
		"BT /F1 8 Tf 32 72 Td (QR de validacion para reparto) Tj ET",
		`BT /F1 6 Tf 32 58 Td (${escapePdfText(qrPayload)}) Tj ET`,
		"BT /F1 8 Tf 32 38 Td (Escanear al completar la visita de entrega.) Tj ET",
	].join("\n");

	return buildPdfBuffer({
		imageBuffer: qrJpegBuffer,
		imageWidth: metadata.width ?? 900,
		imageHeight: metadata.height ?? 900,
		contentStream,
	});
}

export async function buildOrderDeliveryQrPdf(delivery: OrderDeliverySummary) {
	const isAgencyDelivery = delivery.fulfillment_method === "agency";
	const qrJpegBuffer = isAgencyDelivery
		? await sharp({
				create: {
					width: 900,
					height: 900,
					channels: 3,
					background: "#ffffff",
				},
			})
				.jpeg({ quality: 92 })
				.toBuffer()
		: await fetch(buildOrderDeliveryQrImageUrl(delivery.id)).then(
				async (qrResponse) => {
					if (!qrResponse.ok) {
						throw new Error("No se pudo generar la imagen QR del reparto.");
					}

					const qrPngBuffer = Buffer.from(await qrResponse.arrayBuffer());
					return sharp(qrPngBuffer)
						.resize(900, 900, {
							fit: "contain",
							background: "#ffffff",
						})
						.flatten({ background: "#ffffff" })
						.jpeg({ quality: 92 })
						.toBuffer();
				},
			);
	const metadata = await sharp(qrJpegBuffer).metadata();
	const qrPayload = isAgencyDelivery
		? ""
		: buildOrderDeliveryQrPayload(delivery.id);
	const commercialName = delivery.commercial_name || "Comercial";
	const commercialAddress =
		delivery.commercial_address || "Direccion del comercial";
	const commercialCity = delivery.commercial_territory || "Ciudad comercial";
	const clientName = delivery.client_name || "Cliente";
	const clientAddress = delivery.client_address || "Direccion del cliente";
	const clientCity = delivery.client_city || "Ciudad cliente";
	const clientPostalProvince =
		[delivery.client_postal_code, delivery.client_province]
			.filter(Boolean)
			.join(" ") || "CP cliente provincia";
	const phone = delivery.commercial_phone || "Telefono comercial";
	const deliveryId = `REPARTO ${delivery.id.slice(0, 8).toUpperCase()}`;
	const contentStream = [
		"1 1 1 rg",
		"12 12 396 274 re f",
		"0.78 0.80 0.84 RG",
		"12 12 396 274 re S",
		"0 0 0 rg",
		"0.95 0.95 0.95 rg",
		"24 74 150 150 re f",
		"0 0 0 rg",
		...(isAgencyDelivery
			? [
					"BT /F2 30 Tf 36 142 Td (AGENCIA) Tj ET",
					"0.78 0.80 0.84 RG",
					"24 74 150 150 re S",
				]
			: ["q", "134 0 0 134 32 82 cm", "/Im1 Do", "Q"]),
		textLine({ x: 190, y: 258, size: 11, text: "REMITENTE:", font: "F2" }),
		textLine({
			x: 278,
			y: 257,
			size: 13,
			text: commercialName,
			font: "F2",
			maxWidth: 116,
		}),
		textLine({
			x: 190,
			y: 236,
			size: 12,
			text: commercialAddress,
			font: "F2",
			maxWidth: 204,
		}),
		textLine({
			x: 190,
			y: 216,
			size: 11,
			text: commercialCity,
			font: "F2",
			maxWidth: 204,
		}),
		textLine({
			x: 190,
			y: 198,
			size: 9,
			text: "CP comercial / Provincia",
			font: "F2",
			maxWidth: 204,
		}),
		textLine({ x: 190, y: 156, size: 11, text: "DESTINATARIO:", font: "F2" }),
		textLine({
			x: 190,
			y: 138,
			size: 12,
			text: clientName,
			font: "F2",
			maxWidth: 204,
		}),
		textLine({
			x: 190,
			y: 118,
			size: 10,
			text: clientAddress,
			font: "F2",
			maxWidth: 204,
		}),
		textLine({
			x: 190,
			y: 101,
			size: 10,
			text: clientCity,
			font: "F2",
			maxWidth: 204,
		}),
		textLine({
			x: 190,
			y: 86,
			size: 8,
			text: clientPostalProvince,
			font: "F2",
			maxWidth: 204,
		}),
		textLine({ x: 24, y: 48, size: 16, text: "BULTOS:", font: "F2" }),
		textLine({ x: 102, y: 47, size: 18, text: delivery.package_count, font: "F2" }),
		textLine({
			x: 270,
			y: 66,
			size: 14,
			text: deliveryId,
			font: "F2",
			maxWidth: 124,
		}),
		textLine({
			x: 220,
			y: 38,
			size: 14,
			text: phone,
			font: "F2",
			maxWidth: 174,
		}),
		qrPayload ? textLine({ x: 24, y: 20, size: 5, text: qrPayload }) : "",
	].join("\n");

	return buildPdfBuffer({
		imageBuffer: qrJpegBuffer,
		imageWidth: metadata.width ?? 900,
		imageHeight: metadata.height ?? 900,
		contentStream,
		pageWidth: A6_LANDSCAPE_WIDTH,
		pageHeight: A6_LANDSCAPE_HEIGHT,
	});
}
