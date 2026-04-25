import { auth } from "@/auth";
import { redirect } from "next/navigation";

// Función de utilidad para proteger rutas que requieren sesión de administrador.
export async function requireAdminSession() {
	const session = await auth();

	if (!session) {
		redirect("/login");
	}

	if (session.user?.role !== "admin") {
		redirect("/");
	}

	return session;
}

// Función de utilidad para proteger rutas que requieren sesión de usuario autenticado (cualquier rol).
export async function requireUserSession() {
	const session = await auth();

	if (!session) {
		redirect("/login");
	}

	return session;
}

// Función de utilidad para proteger rutas exclusivas del área comercial.
export async function requireCommercialSession() {
	const session = await auth();

	if (!session) {
		redirect("/login");
	}

	if (session.user?.role !== "commercial") {
		redirect("/");
	}

	return session;
}
