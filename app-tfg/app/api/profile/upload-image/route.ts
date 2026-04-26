import { NextResponse } from "next/server";
import {
	badRequestError,
	getSessionUser,
	notFoundError,
	unauthorizedError,
} from "@/lib/api/server";
import {
	deleteImageByPublicId,
	extractPublicIdFromUrl,
	uploadProfileImage,
} from "@/lib/cloudinary";
import { getDataSource } from "@/lib/typeorm/data-source";
import { User } from "@/lib/typeorm/entities/User";

// POST /api/profile/upload-image
// Sube una nueva imagen de perfil a Cloudinary y devuelve la URL resultante.
export async function POST(request: Request) {
	const sessionUser = await getSessionUser();

	if (!sessionUser?.id) {
		return unauthorizedError("No autenticado");
	}

	try {
		const formData = await request.formData();
		const file = formData.get("file");

		if (!(file instanceof File)) {
			return badRequestError("No se ha enviado ningun archivo", "FILE_REQUIRED");
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

		const ds = await getDataSource();
		const userRepo = ds.getRepository(User);
		const user = await userRepo.findOne({
			where: { id: sessionUser.id },
		});

		if (!user) {
			return notFoundError("Usuario no encontrado", "USER_NOT_FOUND");
		}

		const previousPublicId = extractPublicIdFromUrl(user.profile_image_url);
		const arrayBuffer = await file.arrayBuffer();
		const buffer = Buffer.from(arrayBuffer);
		const base64File = `data:${file.type};base64,${buffer.toString("base64")}`;
		const uploadResult = await uploadProfileImage(base64File);

		if (previousPublicId && previousPublicId !== uploadResult.public_id) {
			try {
				await deleteImageByPublicId(previousPublicId);
			} catch (error) {
				console.error("Error borrando imagen anterior:", error);
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
		console.error("Error al subir imagen de perfil:", error);

		return NextResponse.json(
			{
				message: "No se pudo subir la imagen",
				code: "UPLOAD_IMAGE_ERROR",
			},
			{ status: 500 },
		);
	}
}
