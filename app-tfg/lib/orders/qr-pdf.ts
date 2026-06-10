import sharp from "sharp";
import type { OrderSummary } from "@/lib/contracts/order";
import { buildOrderQrImageUrl, buildOrderQrPayload } from "@/lib/orders/qr";

const A6_WIDTH = 298;
const A6_HEIGHT = 420;

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
}) {
	const chunks: Buffer[] = [];
	const offsets: number[] = [];
	let currentOffset = 0;

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
		`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A6_WIDTH} ${A6_HEIGHT}] /Resources << /Font << /F1 4 0 R >> /XObject << /Im1 5 0 R >> >> /Contents 6 0 R >>`,
	);
	writeObject(
		4,
		"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
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
	write(`xref\n0 7\n`);
	write("0000000000 65535 f \n");
	for (let id = 1; id <= 6; id += 1) {
		write(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
	}
	write(
		`trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`,
	);

	return Buffer.concat(chunks);
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
