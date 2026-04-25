import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPasswordValidationMessage } from "@/lib/utils/password-utils";
import { getDataSource } from "@/lib/typeorm/data-source";
import { User } from "@/lib/typeorm/entities/User";
import { Client } from "@/lib/typeorm/entities/Client";
import {
	applyClientUpdateOrThrow,
	UpdateClientError,
} from "@/lib/typeorm/services/commercial/client";

type UpdateProfileRequestBody = {
	name?: string;
	email?: string;
	company?: string | null;
	phone?: string | null;
	profile_image_url?: string | null;
	password?: string;
	confirmPassword?: string;
	clientProfile?: {
		name?: string;
		contact_name?: string | null;
		tax_id?: string | null;
		address?: string | null;
		city?: string | null;
		postal_code?: string | null;
		province?: string | null;
		lat?: number | string | null;
		lng?: number | string | null;
		visit_window_start_time?: string | null;
		visit_window_end_time?: string | null;
		notes?: string | null;
	} | null;
};

// Helpers
// Normaliza un texto: si es null o undefined lo convierte a cadena vacía,
// y recorta espacios al inicio y al final
function normalizeText(value: string | null | undefined) {
	return String(value ?? "").trim();
}

// Normaliza un correo electrónico para almacenarlo y compararlo correctamente
function normalizeEmail(value: string | null | undefined) {
	return String(value ?? "")
		.trim()
		.toLowerCase();
}

// Valida el formato básico de un correo electrónico
function isValidEmail(value: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

// Valida que una URL sea una imagen válida de Cloudinary
// (o que sea null/undefined)
function isValidCloudinaryImageUrl(value: string | null) {
	if (!value) return true;

	try {
		const url = new URL(value);
		return url.protocol === "https:" && url.hostname === "res.cloudinary.com";
	} catch {
		return false;
	}
}

// Endpoint para actualizar el perfil del usuario
export async function PATCH(request: Request) {
	try {
		const session = await auth();

		if (!session) {
			return NextResponse.json({ message: "No autenticado" }, { status: 401 });
		}

		if (!session.user?.id) {
			return NextResponse.json({ message: "Sesión inválida" }, { status: 401 });
		}

		const body = (await request.json()) as UpdateProfileRequestBody;

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
					message: "La URL de la imagen de perfil no es válida",
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
					message: "El correo electrónico es obligatorio",
					code: "INVALID_EMAIL",
				},
				{ status: 400 },
			);
		}

		if (!isValidEmail(email)) {
			return NextResponse.json(
				{
					message: "El correo electrónico no es válido",
					code: "INVALID_EMAIL_FORMAT",
				},
				{ status: 400 },
			);
		}

		if (password || confirmPassword) {
			if (password !== confirmPassword) {
				return NextResponse.json(
					{
						message: "Las contraseñas no coinciden",
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

		await ds.transaction(async (manager) => {
			const userRepo = manager.getRepository(User);
			const clientRepo = manager.getRepository(Client);

			const user = await userRepo.findOne({
				where: { id: session.user.id },
				relations: {
					role: true,
				},
			});

			if (!user) {
				throw new Error("USER_NOT_FOUND");
			}

			// Si el usuario intenta cambiar su correo, comprobamos que no exista ya
			// otro usuario con ese mismo email.
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

			// Si el usuario autenticado es de tipo cliente y el formulario envía
			// datos de perfil cliente, actualizamos también su registro enlazado.
			// OJO: aquí ya NO actualizamos el cliente "a mano", sino reutilizando
			// la lógica compartida que también regeocodifica dirección -> lat/lng.
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
		});

		return NextResponse.json(
			{
				message: password
					? "Perfil, correo y contraseña actualizados correctamente"
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

		if (error instanceof UpdateClientError) {
			return NextResponse.json(
				{
					message: error.message,
					code: "INVALID_CLIENT_ADDRESS",
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
					message: "Ya existe un usuario con ese correo electrónico",
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
