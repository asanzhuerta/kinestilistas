import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import {
	getSessionUser,
	jsonError,
	readJsonBody,
	unauthorizedError,
} from "@/lib/api/server";
import {
	deleteReplacedCloudinaryImage,
	isValidCloudinaryImageUrl,
} from "@/lib/cloudinary";
import type { UpdateOwnProfileBody } from "@/lib/contracts/user-profile";
import { getPasswordValidationMessage } from "@/lib/utils/password-utils";
import { isValidEmail, normalizeEmail, normalizeText } from "@/lib/utils/text";
import { getDataSource } from "@/lib/typeorm/data-source";
import { Client } from "@/lib/typeorm/entities/Client";
import { User } from "@/lib/typeorm/entities/User";
import {
	applyClientUpdateOrThrow,
	UpdateClientError,
} from "@/lib/typeorm/services/commercial/client";

// PATCH /api/profile
// Actualiza los datos del perfil del usuario autenticado y, si es cliente, su ficha asociada.
export async function PATCH(request: Request) {
	const sessionUser = await getSessionUser();

	if (!sessionUser) {
		return unauthorizedError("No autenticado");
	}

	if (!sessionUser.id) {
		return jsonError("Sesion invalida", 401, "INVALID_SESSION");
	}

	try {
		const body = await readJsonBody<UpdateOwnProfileBody>(request);

		const name = normalizeText(body.name);
		const email = normalizeEmail(body.email);
		const company = normalizeText(body.company) || null;
		const phone = normalizeText(body.phone) || null;
		const profileImageUrl = normalizeText(body.profile_image_url) || null;
		const password = String(body.password ?? "");
		const confirmPassword = String(body.confirmPassword ?? "");

		if (!isValidCloudinaryImageUrl(profileImageUrl)) {
			return NextResponse.json(
				{
					message: "La URL de la imagen de perfil no es valida",
					code: "INVALID_PROFILE_IMAGE_URL",
				},
				{ status: 400 },
			);
		}

		if (!name) {
			return NextResponse.json(
				{
					message: "El nombre es obligatorio",
					code: "INVALID_NAME",
				},
				{ status: 400 },
			);
		}

		if (!email) {
			return NextResponse.json(
				{
					message: "El correo electronico es obligatorio",
					code: "INVALID_EMAIL",
				},
				{ status: 400 },
			);
		}

		if (!isValidEmail(email)) {
			return NextResponse.json(
				{
					message: "El correo electronico no es valido",
					code: "INVALID_EMAIL_FORMAT",
				},
				{ status: 400 },
			);
		}

		if (password || confirmPassword) {
			if (password !== confirmPassword) {
				return NextResponse.json(
					{
						message: "Las contrasenas no coinciden",
						code: "PASSWORD_MATCH",
					},
					{ status: 400 },
				);
			}

			const passwordValidationMessage = getPasswordValidationMessage(password);

			if (passwordValidationMessage) {
				return NextResponse.json(
					{
						message: passwordValidationMessage,
						code: "PASSWORD_RULES",
					},
					{ status: 400 },
				);
			}
		}

		const ds = await getDataSource();

		const profileImageChange = await ds.transaction(async (manager) => {
			const userRepo = manager.getRepository(User);
			const clientRepo = manager.getRepository(Client);

			const user = await userRepo.findOne({
				where: { id: sessionUser.id },
				relations: {
					role: true,
				},
			});

			if (!user) {
				throw new Error("USER_NOT_FOUND");
			}

			if (user.email !== email) {
				const existingUserWithEmail = await userRepo.findOne({
					where: { email },
					select: {
						id: true,
						email: true,
					},
				});

				if (existingUserWithEmail && existingUserWithEmail.id !== user.id) {
					throw new Error("EMAIL_ALREADY_IN_USE");
				}
			}

			const previousProfileImageUrl = user.profile_image_url;
			user.name = name;
			user.email = email;
			user.company = company;
			user.phone = phone;
			user.profile_image_url = profileImageUrl;

			if (password) {
				user.password_hash = await bcrypt.hash(password, 10);
			}

			user.updated_at = new Date();
			await userRepo.save(user);

			if (user.role.code === "client" && body.clientProfile) {
				const client = await clientRepo.findOne({
					where: { id: user.id },
				});

				if (client) {
					await applyClientUpdateOrThrow(client, {
						name: body.clientProfile.name,
						contactName: body.clientProfile.contact_name,
						taxId: body.clientProfile.tax_id,
						address:
							body.clientProfile.address === null
								? undefined
								: body.clientProfile.address,
						city:
							body.clientProfile.city === null
								? undefined
								: body.clientProfile.city,
						postalCode: body.clientProfile.postal_code,
						province: body.clientProfile.province,
						lat: body.clientProfile.lat,
						lng: body.clientProfile.lng,
						visitWindowStartTime: body.clientProfile.visit_window_start_time,
						visitWindowEndTime: body.clientProfile.visit_window_end_time,
						notes: body.clientProfile.notes,
					});

					await clientRepo.save(client);
				}
			}

			return {
				previousProfileImageUrl,
				nextProfileImageUrl: user.profile_image_url,
			};
		});

		try {
			await deleteReplacedCloudinaryImage(
				profileImageChange.previousProfileImageUrl,
				profileImageChange.nextProfileImageUrl,
			);
		} catch (cleanupError) {
			console.error(
				"[profile] Error borrando la imagen anterior de Cloudinary:",
				cleanupError,
			);
		}

		return NextResponse.json(
			{
				message: password
					? "Perfil, correo y contrasena actualizados correctamente"
					: "Perfil y correo actualizados correctamente",
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Error al actualizar el perfil:", error);

		if (error instanceof UpdateClientError) {
			return NextResponse.json(
				{
					message: error.message,
					code: "CLIENT_PROFILE_UPDATE_ERROR",
				},
				{ status: error.status },
			);
		}

		if (error instanceof Error && error.message === "USER_NOT_FOUND") {
			return NextResponse.json(
				{
					message: "Usuario no encontrado",
					code: "USER_NOT_FOUND",
				},
				{ status: 404 },
			);
		}

		if (error instanceof Error && error.message === "EMAIL_ALREADY_IN_USE") {
			return NextResponse.json(
				{
					message: "Ya existe un usuario con ese correo electronico",
					code: "EMAIL_ALREADY_IN_USE",
				},
				{ status: 409 },
			);
		}

		return NextResponse.json(
			{
				message: "Error interno del servidor",
				code: "INTERNAL_SERVER_ERROR",
			},
			{ status: 500 },
		);
	}
}
