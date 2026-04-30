import { v2 as cloudinary } from "cloudinary";

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

// Elimina una imagen de Cloudinary por public_id
export async function deleteImageByPublicId(publicId: string) {
	return cloudinary.uploader.destroy(publicId, {
		resource_type: "image",
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
export function extractPublicIdFromUrl(url: string | null | undefined) {
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

		// Quita versión tipo v12345
		if (publicIdParts[0]?.match(/^v\d+$/)) {
			publicIdParts.shift();
		}

		if (publicIdParts.length === 0) return null;

		const joinedPath = publicIdParts.join("/");

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
