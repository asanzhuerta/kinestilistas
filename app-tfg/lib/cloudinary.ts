import { randomUUID } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { sanitizeDownloadFileName } from "@/lib/cloudinary-url";

// ============================================================================
// CONFIGURACIÓN
// ============================================================================
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
	throw new Error("Faltan variables de entorno de Cloudinary");
}

cloudinary.config({
	cloud_name: cloudName,
	api_key: apiKey,
	api_secret: apiSecret,
	secure: true,
});

export default cloudinary;

export const CLOUDINARY_PROFILE_IMAGES_FOLDER =
	process.env.CLOUDINARY_PROFILE_IMAGES_FOLDER ||
	"kinestilistas/profile-images";

export const CLOUDINARY_CATALOG_IMAGES_FOLDER =
	process.env.CLOUDINARY_CATALOG_IMAGES_FOLDER ||
	"kinestilistas/catalog-images";

export const CLOUDINARY_SALON_RESULT_IMAGES_FOLDER =
	process.env.CLOUDINARY_SALON_RESULT_IMAGES_FOLDER ||
	"kinestilistas/salon-result-images";

export const CLOUDINARY_PROMOTION_ATTACHMENTS_FOLDER =
	process.env.CLOUDINARY_PROMOTION_ATTACHMENTS_FOLDER ||
	"kinestilistas/promotion-attachments";

export const CLOUDINARY_CATALOG_DOCUMENTS_FOLDER =
	process.env.CLOUDINARY_CATALOG_DOCUMENTS_FOLDER ||
	"kinestilistas/catalog-documents";

// ============================================================================
// HELPERS REUTILIZABLES
// ============================================================================

// Sube una imagen a Cloudinary desde base64
export async function uploadProfileImage(base64File: string) {
	return cloudinary.uploader.upload(base64File, {
		folder: CLOUDINARY_PROFILE_IMAGES_FOLDER,
		resource_type: "image",
	});
}

export async function uploadCatalogImage(base64File: string) {
	return cloudinary.uploader.upload(base64File, {
		folder: CLOUDINARY_CATALOG_IMAGES_FOLDER,
		resource_type: "image",
	});
}

export async function uploadSalonResultImage(base64File: string) {
	return cloudinary.uploader.upload(base64File, {
		folder: CLOUDINARY_SALON_RESULT_IMAGES_FOLDER,
		resource_type: "image",
	});
}

export async function uploadPromotionImage(base64File: string) {
	return cloudinary.uploader.upload(base64File, {
		folder: CLOUDINARY_PROMOTION_ATTACHMENTS_FOLDER,
		resource_type: "image",
	});
}

function buildRawPdfPublicId(fileName: string | null | undefined) {
	const safeName = sanitizeDownloadFileName(fileName, "documento.pdf", {
		ensurePdfExtension: true,
	});
	const baseName = safeName.replace(/\.pdf$/i, "");
	const suffix = randomUUID().slice(0, 8);

	return `${baseName}-${suffix}.pdf`;
}

async function uploadCloudinaryPdfDocument(
	base64File: string,
	folder: string,
	fileName: string | null | undefined,
) {
	const safeName = sanitizeDownloadFileName(fileName, "documento.pdf", {
		ensurePdfExtension: true,
	});

	return cloudinary.uploader.upload(base64File, {
		folder,
		resource_type: "raw",
		public_id: buildRawPdfPublicId(fileName),
		filename_override: safeName,
		use_filename: false,
		unique_filename: false,
	});
}

export async function uploadPromotionDocument(
	base64File: string,
	fileName?: string | null,
) {
	return uploadCloudinaryPdfDocument(
		base64File,
		CLOUDINARY_PROMOTION_ATTACHMENTS_FOLDER,
		fileName,
	);
}

export async function uploadCatalogDocument(
	base64File: string,
	fileName?: string | null,
) {
	return uploadCloudinaryPdfDocument(
		base64File,
		CLOUDINARY_CATALOG_DOCUMENTS_FOLDER,
		fileName,
	);
}

// Elimina una imagen de Cloudinary por public_id
export async function deleteImageByPublicId(publicId: string) {
	return cloudinary.uploader.destroy(publicId, {
		resource_type: "image",
		invalidate: true,
	});
}

export async function deleteRawFileByPublicId(publicId: string) {
	return cloudinary.uploader.destroy(publicId, {
		resource_type: "raw",
		invalidate: true,
	});
}

export async function deleteImageByUrl(url: string | null | undefined) {
	const publicId = extractPublicIdFromUrl(url);

	if (!publicId) {
		return null;
	}

	return deleteImageByPublicId(publicId);
}

export async function deleteReplacedCloudinaryImage(
	previousUrl: string | null | undefined,
	nextUrl: string | null | undefined,
) {
	const previousPublicId = extractPublicIdFromUrl(previousUrl);
	const nextPublicId = extractPublicIdFromUrl(nextUrl);

	if (!previousPublicId || previousPublicId === nextPublicId) {
		return null;
	}

	return deleteImageByPublicId(previousPublicId);
}

// Extrae el public_id desde una URL de Cloudinary
function isCloudinaryTransformationSegment(part: string) {
	return (
		part.startsWith("fl_") ||
		part.includes(",") ||
		/^(c|f|q|w|h|e|g|r|x|y|a|b|bo|co|dpr|so|eo|du|pg)_/.test(part)
	);
}

export function extractPublicIdFromUrl(
	url: string | null | undefined,
	options: { keepExtension?: boolean } = {},
) {
	if (!url) return null;

	try {
		const parsedUrl = new URL(url);

		if (parsedUrl.hostname !== "res.cloudinary.com") {
			return null;
		}

		const parts = parsedUrl.pathname.split("/").filter(Boolean);
		const uploadIndex = parts.findIndex((part) => part === "upload");

		if (uploadIndex === -1) return null;

		const publicIdParts = parts.slice(uploadIndex + 1);

		while (
			publicIdParts.length > 0 &&
			isCloudinaryTransformationSegment(publicIdParts[0])
		) {
			publicIdParts.shift();
		}

		// Quita versión tipo v12345
		if (publicIdParts[0]?.match(/^v\d+$/)) {
			publicIdParts.shift();
		}

		if (publicIdParts.length === 0) return null;

		const joinedPath = publicIdParts.join("/");

		if (options.keepExtension) {
			return joinedPath;
		}

		// Quita extensión
		return joinedPath.replace(/\.[^/.]+$/, "");
	} catch {
		return null;
	}
}

// Valida que la URL de perfil use el host seguro de Cloudinary.
export function isValidCloudinaryImageUrl(value: string | null) {
	if (!value) {
		return true;
	}

	try {
		const url = new URL(value);
		return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
	} catch {
		return false;
	}
}

export function isValidPublicColorReferenceImageUrl(value: string | null) {
	if (!value) {
		return true;
	}

	try {
		const url = new URL(value);

		return (
			url.protocol === "https:" &&
			url.hostname === "kinmobileapp.com" &&
			url.pathname.startsWith("/kincolor/img/")
		);
	} catch {
		return false;
	}
}

export function isValidColorReferenceImageUrl(value: string | null) {
	return (
		isValidCloudinaryImageUrl(value) ||
		isValidPublicColorReferenceImageUrl(value)
	);
}

export function isValidPublicColorChartImageUrl(value: string | null) {
	if (!value) {
		return true;
	}

	try {
		const url = new URL(value);

		return (
			(url.protocol === "https:" &&
				url.hostname === "kinmobileapp.com" &&
				url.pathname.startsWith("/kincolor/img/")) ||
			(url.protocol === "https:" &&
				url.hostname === "www.kincosmetics.com" &&
				url.pathname.startsWith("/tmp/images/"))
		);
	} catch {
		return false;
	}
}

export function isValidColorChartImageUrl(value: string | null) {
	return (
		isValidCloudinaryImageUrl(value) ||
		isValidPublicColorChartImageUrl(value)
	);
}
