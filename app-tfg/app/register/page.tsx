"use client";

import { useState } from "react";
import HeaderTitle from "../components/basics/HeaderTitle";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PageTransition from "../components/animations/PageTransition";
import PasswordFieldWithStrength from "../components/users/PasswordFieldWithStrength";
import SafeForm from "../components/forms/SafeForm";
import SubmitButton from "../components/forms/SubmitButton";

export default function RegisterPage() {
	const [leaving, setLeaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError("");
		setSuccess("");
		setLoading(true);

		const form = e.currentTarget;
		const formData = new FormData(form);

		const email = String(formData.get("email") ?? "")
			.trim()
			.toLowerCase();
		const name = String(formData.get("name") ?? "").trim();
		const company = String(formData.get("company") ?? "").trim();
		const phone = String(formData.get("phone") ?? "").trim();
		const password = String(formData.get("password") ?? "");
		const confirmPassword = String(formData.get("confirm_password") ?? "");

		// Validación básica de campos requeridos del formulario público
		if (!email || !name || !company || !password || !confirmPassword) {
			setError("Por favor, completa todos los campos requeridos");
			setLoading(false);
			return;
		}

		// Validación básica de confirmación de contraseña
		if (password !== confirmPassword) {
			setError("Las contraseñas no coinciden");
			setLoading(false);
			return;
		}

		try {
			/**
			 * En el flujo público actual todas las solicitudes son de tipo cliente.
			 *
			 * Enviamos el código técnico explícitamente para que la API y el servicio
			 * no dependan de valores implícitos ni de etiquetas de interfaz.
			 */
			const response = await fetch("/api/auth/register-request", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					email,
					name,
					company,
					phone,
					password,
					type: "client",
				}),
			});

			const data = await response.json();

			// Si la API devuelve error, mostramos el mensaje al usuario
			if (!response.ok) {
				setError(data.message || "Error al enviar la solicitud");
				setLoading(false);
				return;
			}

			setSuccess("Solicitud enviada. El administrador la revisará pronto.");
			form.reset();

			// Tras mostrar confirmación, redirigimos al login
			setTimeout(() => {
				setLeaving(true);
				router.push("/login");
			}, 2000);
		} catch {
			setError("Error al procesar la solicitud");
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className="app-bg app-bg-login min-h-[100svh] w-full px-4 py-4 text-slate-800">
			<HeaderTitle title="KinEstilistas" />

			<PageTransition
				isLeaving={leaving}
				className="mx-auto max-w-2xl rounded-2xl p-6 text-center"
			>
				<div className="mx-auto mt-6 w-full max-w-sm">
					<SafeForm
						onSubmit={handleSubmit}
						className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-md"
					>
						<h2 className="mb-2 text-center text-xl font-semibold">
							Solicitar acceso
						</h2>

						<input
							name="name"
							type="text"
							placeholder="Nombre completo"
							autoComplete="name"
							required
							className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black"
						/>

						<input
							name="email"
							type="email"
							placeholder="Correo electrónico"
							autoComplete="email"
							required
							className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black"
						/>

						<input
							name="company"
							type="text"
							placeholder="Empresa"
							autoComplete="organization"
							required
							className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black"
						/>

						<input
							name="phone"
							type="tel"
							placeholder="Teléfono"
							autoComplete="tel"
							className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black"
						/>

						<PasswordFieldWithStrength
							name="password"
							label="Contraseña"
							placeholder="Contraseña"
							required
							showConfirm
						/>

						<SubmitButton
							isSubmitting={loading}
							submittingText="Enviando..."
							className="mt-2 rounded-lg bg-slate-950 font-medium text-white hover:bg-slate-900"
						>
							Solicitar acceso
						</SubmitButton>

						{error && (
							<p className="text-center text-sm text-red-600">{error}</p>
						)}

						{success && (
							<p className="text-center text-sm text-green-600">{success}</p>
						)}
					</SafeForm>
				</div>

				<div className="mx-auto mt-6 w-full max-w-sm text-center">
					<p className="text-sm text-slate-600">
						¿Ya tienes acceso?{" "}
						<Link
							href="/login"
							className="font-semibold text-black hover:underline"
						>
							Inicia sesión aquí
						</Link>
					</p>
				</div>
			</PageTransition>
		</main>
	);
}
