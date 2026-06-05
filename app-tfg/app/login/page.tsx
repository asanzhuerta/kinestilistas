"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";
import PageTransition from "../components/animations/PageTransition";
import HeaderTitle from "../components/basics/HeaderTitle";
import SafeForm from "../components/forms/SafeForm";
import SubmitButton from "../components/forms/SubmitButton";

export default function LoginPage() {
	const [leaving, setLeaving] = useState(false);
	const [error, setError] = useState("");
	const [loading, setLoading] = useState(false);
	const router = useRouter();

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setError("");
		setLoading(true);

		try {
			const formData = new FormData(event.currentTarget);
			const identifier = String(formData.get("identifier") ?? "").trim();
			const password = String(formData.get("password") ?? "");

			const result = await signIn("credentials", {
				identifier,
				password,
				redirect: false,
			});

			if (result?.error) {
				setError(
					result.code === "rate_limited"
						? "Demasiados intentos, inténtelo más tarde"
						: "Correo, teléfono, usuario o contraseña incorrectos",
				);
				setLoading(false);
				return;
			}

			const userResult = await fetch("/api/auth/session");
			const userData = await userResult.json();

			setLeaving(true);

			if (userData?.user?.role === "admin") {
				router.push("/admin");
				return;
			}

			if (userData?.user?.role === "commercial") {
				router.push("/commercials");
				return;
			}

			router.push("/clients");
		} catch {
			setError("Error al iniciar sesión");
			setLoading(false);
		}
	}

	return (
		<main className="app-bg min-h-[100svh] w-full px-4 py-4 text-slate-800">
			<HeaderTitle
				title="KinEstilistas "
				subtitle="Alta Peluqueria &amp; Estetica"
			/>

			<PageTransition
				isLeaving={leaving}
				className="mx-auto max-w-2xl rounded-2xl p-6 text-center"
			>
				<div className="mx-auto mt-6 w-full max-w-sm">
					<SafeForm
						onSubmit={handleSubmit}
						legend="Credenciales de acceso"
						className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-md"
					>
						<h2 className="mb-2 text-center text-xl font-semibold">
							Iniciar sesion
						</h2>

						<div className="space-y-2 text-left">
							<label
								htmlFor="login-identifier"
								className="text-sm font-semibold text-slate-700"
							>
								Correo, telefono o usuario
							</label>
							<input
								id="login-identifier"
								name="identifier"
								type="text"
								placeholder="Correo, telefono o usuario"
								autoComplete="username"
								required
								className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black"
							/>
						</div>

						<div className="space-y-2 text-left">
							<label
								htmlFor="login-password"
								className="text-sm font-semibold text-slate-700"
							>
								Contrasena
							</label>
							<input
								id="login-password"
								name="password"
								type="password"
								placeholder="Contrasena"
								autoComplete="current-password"
								required
								className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black"
							/>
						</div>

						<SubmitButton
							isSubmitting={loading}
							submittingText="Entrando..."
							className="mt-2 rounded-lg bg-slate-950 font-medium text-white hover:bg-slate-900"
						>
							Entrar
						</SubmitButton>

						{error ? (
							<p className="text-center text-sm text-red-600">{error}</p>
						) : null}
					</SafeForm>
				</div>

				<div className="mx-auto mt-6 w-full max-w-sm text-center">
					<p className="text-sm text-slate-600">
						Nuevo cliente?{" "}
						<Link
							href="/register"
							className="font-semibold text-black hover:underline"
						>
							Solicita aqui tu acceso.
						</Link>
					</p>
				</div>
			</PageTransition>
		</main>
	);
}
