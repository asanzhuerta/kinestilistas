import { NextResponse } from "next/server";
import {
	badRequestError,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	deleteReplacedCloudinaryImage,
	uploadCatalogImage,
} from "@/lib/cloudinary";

export async function POST(request: Request) {
	const user = await requireRoleUser("admin");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const formData = await request.formData();
		const file = formData.get("file");
		const previousImageUrl = String(formData.get("previousImageUrl") ?? "").trim();

		if (!(file instanceof File)) {
			return badRequestError("No se ha enviado ningún archivo", "FILE_REQUIRED");
		}

		if (!file.type.startsWith("image/")) {
			return badRequestError(
				"El archivo debe ser una imagen",
				"INVALID_FILE_TYPE",
			);
		}

		const maxSizeInBytes = 5 * 1024 * 1024;

		if (file.size > maxSizeInBytes) {
			return badRequestError(
				"La imagen no puede superar 5 MB",
				"FILE_TOO_LARGE",
			);
		}

		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const base64File = `data:${file.type};base64,${buffer.toString("base64")}`;
		const uploadResult = await uploadCatalogImage(base64File);

		if (previousImageUrl) {
			try {
				await deleteReplacedCloudinaryImage(
					previousImageUrl,
					uploadResult.secure_url,
				);
			} catch (error) {
				console.error("[admin/catalog/upload-image] delete previous error:", error);
			}
		}

		return NextResponse.json(
			{
				message: "Imagen subida correctamente",
				imageUrl: uploadResult.secure_url,
				publicId: uploadResult.public_id,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("[admin/catalog/upload-image] upload error:", error);

		return NextResponse.json(
			{
				message: "No se pudo subir la imagen",
				code: "UPLOAD_IMAGE_ERROR",
			},
			{ status: 500 },
		);
	}
}
