import { NextResponse } from "next/server";
import {
	badRequestError,
	jsonFromError,
	readJsonBody,
	requireRoleUser,
	unauthorizedError,
} from "@/lib/api/server";
import {
	deleteImageByUrl,
	isValidCloudinaryImageUrl,
	uploadSalonResultImage,
} from "@/lib/cloudinary";

type DeleteSalonResultImageBody = {
	imageUrl?: string | null;
};

export async function POST(request: Request) {
	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const formData = await request.formData();
		const file = formData.get("file");

		if (!(file instanceof File)) {
			return badRequestError("No se ha enviado ninguna imagen", "FILE_REQUIRED");
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
		const uploadResult = await uploadSalonResultImage(base64File);

		return NextResponse.json(
			{
				message: "Imagen de resultado subida correctamente",
				imageUrl: uploadResult.secure_url,
				publicId: uploadResult.public_id,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("[clients/salon-service-result-images][POST] error:", error);
		return jsonFromError(error, "No se pudo subir la imagen del resultado");
	}
}

export async function DELETE(request: Request) {
	const user = await requireRoleUser("client");

	if (!user) {
		return unauthorizedError();
	}

	try {
		const body = await readJsonBody<DeleteSalonResultImageBody>(request);
		const imageUrl = String(body.imageUrl ?? "").trim();

		if (!imageUrl) {
			return badRequestError(
				"Debes indicar la imagen que quieres eliminar",
				"IMAGE_URL_REQUIRED",
			);
		}

		if (!isValidCloudinaryImageUrl(imageUrl)) {
			return badRequestError(
				"La imagen indicada no es válida",
				"IMAGE_URL_INVALID",
			);
		}

		await deleteImageByUrl(imageUrl);

		return NextResponse.json(
			{
				message: "Imagen de resultado eliminada correctamente",
				imageUrl,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("[clients/salon-service-result-images][DELETE] error:", error);
		return jsonFromError(error, "No se pudo eliminar la imagen del resultado");
	}
}
