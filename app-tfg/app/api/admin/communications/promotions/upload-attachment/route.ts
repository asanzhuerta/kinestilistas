import { NextResponse } from "next/server";
import {
	enforceApiRateLimit,
	badRequestError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	deleteImageByPublicId,
	deleteRawFileByPublicId,
	extractPublicIdFromUrl,
	uploadPromotionDocument,
	uploadPromotionImage,
} from "@/lib/cloudinary";
import { getCloudinaryAttachmentDownloadUrl } from "@/lib/cloudinary-url";

const MAX_IMAGE_SIZE_IN_BYTES = 5 * 1024 * 1024;
const MAX_PDF_SIZE_IN_BYTES = 10 * 1024 * 1024;

function getAttachmentKind(file: File) {
	if (file.type.startsWith("image/")) {
		return "image" as const;
	}

	if (file.type === "application/pdf") {
		return "pdf" as const;
	}

	return null;
}

async function deletePreviousAttachment(
	previousUrl: string | null,
	previousMimeType: string | null,
	nextUrl: string,
) {
	if (!previousUrl || previousUrl === nextUrl) {
		return;
	}

	const publicId = extractPublicIdFromUrl(previousUrl, {
		keepExtension: previousMimeType === "application/pdf",
	});

	if (!publicId) {
		return;
	}

	if (previousMimeType === "application/pdf") {
		await deleteRawFileByPublicId(publicId);
		return;
	}

	await deleteImageByPublicId(publicId);
}

export async function POST(request: Request) {
	const rateLimitResponse = await enforceApiRateLimit(request);
	if (rateLimitResponse) {
		return rateLimitResponse;
	}

	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const formData = await request.formData();
		const file = formData.get("file");
		const previousUrl =
			String(formData.get("previousUrl") ?? "").trim() || null;
		const previousMimeType =
			String(formData.get("previousMimeType") ?? "").trim() || null;

		if (!(file instanceof File)) {
			return badRequestError("No se ha enviado ningún archivo", "FILE_REQUIRED");
		}

		const kind = getAttachmentKind(file);

		if (!kind) {
			return badRequestError(
				"El adjunto debe ser una imagen o un PDF",
				"INVALID_ATTACHMENT_TYPE",
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
				? await uploadPromotionImage(base64File)
				: await uploadPromotionDocument(base64File, file.name);

		if (previousUrl) {
			try {
				await deletePreviousAttachment(
					previousUrl,
					previousMimeType,
					uploadResult.secure_url,
				);
			} catch (error) {
				console.error(
					"[admin/communications/promotions/upload-attachment] delete previous error:",
					error,
				);
			}
		}

		return NextResponse.json(
			{
				message: "Adjunto subido correctamente",
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
		console.error(
			"[admin/communications/promotions/upload-attachment] upload error:",
			error,
		);

		return NextResponse.json(
			{
				message: "No se pudo subir el adjunto",
				code: "UPLOAD_PROMOTION_ATTACHMENT_ERROR",
			},
			{ status: 500 },
		);
	}
}
