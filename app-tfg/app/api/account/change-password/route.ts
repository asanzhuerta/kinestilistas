import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getPasswordValidationMessage } from "@/lib/utils/password-utils";
import { changeUserPassword } from "@/lib/typeorm/services/users/password";

// POST /api/account/change-password
// Cambia la contraseña del usuario autenticado
export async function POST(request: Request) {
	const session = await auth();

	if (!session?.user?.id) {
		return NextResponse.redirect(new URL("/login", request.url));
	}

	const formData = await request.formData();

	const currentPassword = String(formData.get("current_password") ?? "");
	const newPassword = String(formData.get("new_password") ?? "");
	const confirmNewPassword = String(formData.get("confirm_new_password") ?? "");

	if (!currentPassword || !newPassword || !confirmNewPassword) {
		return NextResponse.redirect(
			new URL("/profile/change-password?error=campos", request.url),
		);
	}

	if (newPassword !== confirmNewPassword) {
		return NextResponse.redirect(
			new URL("/profile/change-password?error=coincidencia", request.url),
		);
	}

	const passwordValidationMessage = getPasswordValidationMessage(newPassword);

	if (passwordValidationMessage) {
		return NextResponse.redirect(
			new URL("/profile/change-password?error=password", request.url),
		);
	}

	const result = await changeUserPassword({
		userId: session.user.id,
		currentPassword,
		newPassword,
		currentAccessSessionId: session.accessSessionId ?? null,
		mode: "self"
	});

	if (!result.ok) {
		return NextResponse.redirect(
			new URL(`/profile/change-password?error=${result.error}`, request.url),
		);
	}

	return NextResponse.redirect(
		new URL("/profile/change-password?success=1", request.url),
	);
}
