import { redirect } from "next/navigation";
import { auth } from "@/auth";
import HeaderTitle from "@/app/components/basics/HeaderTitle";
import PasswordFieldWithStrength from "@/app/components/users/PasswordFieldWithStrength";
import SafeForm from "@/app/components/forms/SafeForm";
import SubmitButton from "@/app/components/forms/SubmitButton";

// Página para cambiar la contraseña propia
export default async function ChangePasswordPage() {
	const session = await auth();

	if (!session?.user) {
		redirect("/login");
	}

	return (
		<>
			<HeaderTitle
				title="Cambiar contraseña"
				showBackButton
				backFallbackHref="/profile"
			/>

			<div className="mx-auto mt-6 w-full max-w-2xl">
				<SafeForm
					action="/api/account/change-password"
					disableUntilHydrated={false}
					className="rounded-2xl border border-white/15 bg-white/10 p-6 shadow-lg backdrop-blur"
				>
					<div className="space-y-4">
						<div>
							<label
								htmlFor="current-password"
								className="mb-1 block text-sm font-medium text-white"
							>
								Contraseña actual
							</label>
							<input
								id="current-password"
								name="current_password"
								type="password"
								required
								autoComplete="current-password"
								className="w-full rounded-xl border border-white/20 bg-black/20 px-4 py-2 text-white outline-none transition focus:border-cyan-400"
							/>
						</div>

						<PasswordFieldWithStrength
							name="new_password"
							label="Nueva contraseña"
							placeholder="Nueva contraseña"
							required
							showConfirm
							confirmName="confirm_new_password"
							confirmLabel="Confirmar nueva contraseña"
						/>
					</div>

					<div className="mt-6">
						<SubmitButton className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-700">
							Cambiar contraseña
						</SubmitButton>
					</div>
				</SafeForm>
			</div>
		</>
	);
}
