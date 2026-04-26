"use client";

import { useState } from "react";
import {
	getAdminCommercialLabel,
} from "@/app/admin/users/_shared/admin-commercial-options";
import PageTransition from "@/app/components/animations/PageTransition";
import SafeForm from "@/app/components/forms/SafeForm";
import SubmitButton from "@/app/components/forms/SubmitButton";
import PasswordFieldWithStrength from "@/app/components/users/PasswordFieldWithStrength";
import { useAdminCommercialOptions } from "@/app/hooks/api/useAdminCommercialOptions";
import { requestJson } from "@/lib/api/client";
import type {
	AdminUserType,
	RegisterAdminUserBody,
	RegisterAdminUserResponse,
} from "@/lib/contracts/admin-user";

export default function AdminRegisterUserPage() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");
	const [userType, setUserType] = useState<AdminUserType>("comercial");
	const [selectedCommercialId, setSelectedCommercialId] = useState("");
	const {
		options: commercials,
		loading: loadingCommercials,
		error: commercialsError,
	} = useAdminCommercialOptions(userType === "cliente");

	async function handleAdminSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();

		setError("");
		setSuccess("");
		setLoading(true);

		const form = event.currentTarget;
		const formData = new FormData(form);
		const email = String(formData.get("email") ?? "").trim().toLowerCase();
		const name = String(formData.get("name") ?? "").trim();
		const company = String(formData.get("company") ?? "").trim();
		const phone = String(formData.get("phone") ?? "").trim();
		const password = String(formData.get("password") ?? "");
		const confirmPassword = String(formData.get("confirm_password") ?? "");
		const type = userType;
		const commercialId =
			type === "cliente" ? selectedCommercialId.trim() : null;

		if (!email || !name || !company || !password) {
			setError("Por favor, completa todos los campos requeridos");
			setLoading(false);
			return;
		}

		if (password !== confirmPassword) {
			setError("Las contrasenas no coinciden");
			setLoading(false);
			return;
		}

		if (type === "cliente" && !commercialId) {
			setError("Debes seleccionar el comercial asignado para el cliente");
			setLoading(false);
			return;
		}

		try {
			await requestJson<RegisterAdminUserResponse>("/api/admin/register-user", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					email,
					name,
					company,
					phone,
					password,
					type,
					commercialId,
				} satisfies RegisterAdminUserBody),
				fallbackMessage: "Error al registrar el usuario",
			});

			setSuccess("Usuario registrado correctamente.");
			form.reset();
			setUserType("comercial");
			setSelectedCommercialId("");
		} catch (submitError) {
			setError(
				submitError instanceof Error
					? submitError.message
					: "Error al procesar el registro",
			);
		} finally {
			setLoading(false);
		}
	}

	return (
		<PageTransition>
			<div className="mx-auto mt-12 w-full max-w-sm">
				<SafeForm
					onSubmit={handleAdminSubmit}
					className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-md"
				>
					<h2 className="mb-2 text-center text-xl font-semibold">
						Registrar usuario (admin)
					</h2>

					<select
						name="type"
						value={userType}
						onChange={(event) => {
							const nextType = event.target.value as AdminUserType;
							setUserType(nextType);

							if (nextType !== "cliente") {
								setSelectedCommercialId("");
							}
						}}
						className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black"
					>
						<option value="comercial">Comercial</option>
						<option value="cliente">Cliente</option>
					</select>

					{userType === "cliente" ? (
						<div className="flex flex-col gap-2">
							<label className="text-sm font-medium text-gray-700">
								Comercial asignado
							</label>

							<select
								name="commercialId"
								value={selectedCommercialId}
								onChange={(event) => setSelectedCommercialId(event.target.value)}
								disabled={loadingCommercials}
								className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100"
							>
								<option value="">
									{loadingCommercials
										? "Cargando comerciales..."
										: "Selecciona un comercial"}
								</option>
								{commercials.map((commercial) => (
									<option key={commercial.id} value={commercial.id}>
										{getAdminCommercialLabel(commercial)}
									</option>
								))}
							</select>

							<p className="text-xs text-gray-500">
								Cada cliente debe quedar asociado a un unico comercial.
							</p>
						</div>
					) : null}

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
						placeholder="Correo electronico"
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
						placeholder="Telefono"
						autoComplete="tel"
						className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-black"
					/>

					<PasswordFieldWithStrength
						name="password"
						label="Contrasena"
						placeholder="Contrasena"
						required
						showConfirm
						confirmName="confirm_password"
					/>

					<SubmitButton
						isSubmitting={loading}
						submittingText="Registrando..."
						className="mt-2 rounded-lg bg-black font-medium text-white hover:opacity-90"
					>
						Registrar usuario
					</SubmitButton>

					{error || commercialsError ? (
						<p className="text-center text-sm text-red-600">
							{error || commercialsError}
						</p>
					) : null}
					{success ? (
						<p className="text-center text-sm text-green-600">{success}</p>
					) : null}
				</SafeForm>
			</div>
		</PageTransition>
	);
}
