import { NextResponse } from "next/server";
import {
	badRequestError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	deleteImageByPublicId,
	deleteRawFileByPublicId,
	extractPublicIdFromUrl,
	uploadCatalogDocument,
	uploadCatalogImage,
} from "@/lib/cloudinary";
import {
	getCloudinaryAttachmentDownloadUrl,
	isPdfResourceUrl,
} from "@/lib/cloudinary-url";

const MAX_IMAGE_SIZE_IN_BYTES = 5 * 1024 * 1024;
const MAX_PDF_SIZE_IN_BYTES = 10 * 1024 * 1024;

function getResourceKind(file: File) {
	if (file.type.startsWith("image/")) {
		return "image" as const;
	}

	if (file.type === "application/pdf") {
		return "pdf" as const;
	}

	return null;
}

async function deletePreviousResource(previousUrl: string | null) {
	if (!previousUrl) {
		return;
	}

	const isPdf = isPdfResourceUrl(previousUrl);
	const publicId = extractPublicIdFromUrl(previousUrl, {
		keepExtension: isPdf,
	});

	if (!publicId) {
		return;
	}

	if (isPdf) {
		await deleteRawFileByPublicId(publicId);
		return;
	}

	await deleteImageByPublicId(publicId);
}

export async function POST(request: Request) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const formData = await request.formData();
		const file = formData.get("file");
		const previousUrl = String(formData.get("previousUrl") ?? "").trim() || null;

		if (!(file instanceof File)) {
			return badRequestError("No se ha enviado ningún archivo", "FILE_REQUIRED");
		}

		const kind = getResourceKind(file);

		if (!kind) {
			return badRequestError(
				"El recurso debe ser una imagen o un PDF",
				"INVALID_RESOURCE_TYPE",
			);
		}

		const maxSize =
			kind === "image" ? MAX_IMAGE_SIZE_IN_BYTES : MAX_PDF_SIZE_IN_BYTES;

		if (file.size > maxSize) {
			return badRequestError(
				kind === "image"
					? "La imagen no puede superar 5 MB"
					: "El PDF no puede superar 10 MB",
				"FILE_TOO_LARGE",
			);
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const base64File = `data:${file.type};base64,${buffer.toString("base64")}`;
		const uploadResult =
			kind === "image"
				? await uploadCatalogImage(base64File)
				: await uploadCatalogDocument(base64File, file.name);

		if (previousUrl) {
			try {
				await deletePreviousResource(previousUrl);
			} catch (error) {
				console.error(
					"[admin/catalog/upload-resource] delete previous error:",
					error,
				);
			}
		}

		return NextResponse.json(
			{
				message: "Recurso subido correctamente",
				url: uploadResult.secure_url,
				downloadUrl:
					kind === "pdf"
						? getCloudinaryAttachmentDownloadUrl(uploadResult.secure_url, file.name)
						: uploadResult.secure_url,
				publicId: uploadResult.public_id,
				name: file.name,
				mimeType: file.type,
				kind,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("[admin/catalog/upload-resource] upload error:", error);

		return NextResponse.json(
			{
				message: "No se pudo subir el recurso",
				code: "UPLOAD_CATALOG_RESOURCE_ERROR",
			},
			{ status: 500 },
		);
	}
}
