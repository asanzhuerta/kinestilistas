import { redirect } from "next/navigation";
import PageTransition from "@/app/components/animations/PageTransition";
import UserProfileCard from "@/app/components/users/UserProfileCard";
import { getUserById } from "@/lib/typeorm/services/users/user";
import HeaderTitle from "@/app/components/basics/HeaderTitle";
import BottomNav from "@/app/components/basics/BottomNav";
import { requireUserSession } from "@/lib/auth/require-session";
// profile/page
// Página de perfil del usuario autenticado, donde puede consultar y editar su información personal.

// Solo accesible para usuarios autenticados, sin importar su rol.
export default async function ProfilePage() {
	// CONTROL DE ACCESO
	// Se asegura de que el usuario esté autenticado y tenga rol de administrador.
	const session = await requireUserSession();

	const user = await getUserById(session.user.id);
	const role = user?.role.code;
	const landingPage =
		role === "admin"
			? "/admin"
			: role === "commercial"
				? "/commercials"
				: role === "client"
					? "/clients"
					: "/";
	// Si el usuario no existe o su rol no es válido, se redirige a la página de inicio.
	if (!user) {
		redirect("/");
	}

	return (
		<main className="app-bg min-h-[100svh] w-full px-4 py-4 pb-28 text-slate-800">
			<div className="mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col">
				<HeaderTitle
					title="KinEstilistas"
					subtitle="Alta Peluquería &amp; Estética"
				/>

				<PageTransition>
					<section className="mx-auto mt-4 w-full max-w-4xl">
						<div className="glass-card overflow-hidden rounded-[28px] border border-white/30 p-4 shadow-xl sm:p-6">
							<div className="mb-5">
								<h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
									Mi perfil
								</h1>
								<p className="mt-1 text-sm text-slate-600 sm:text-base">
									Consulta y edita tu información personal.
								</p>
							</div>

							<UserProfileCard
								mode="edit"
								submitUrl="/api/profile"
								allowPasswordChange
								user={{
									id: user.id,
									name: user.name,
									email: user.email,
									company: user.company,
									phone: user.phone,
									profile_image_url: user.profile_image_url,
									created_at: user.created_at,
									last_login_at: user.last_login_at,
									role: {
										code: user.role.code as "admin" | "client" | "commercial",
									},
									status: {
										code: user.status.code as "active" | "inactive" | "blocked",
									},
								}}
								clientProfile={
									user.linkedClient
										? {
												id: user.linkedClient.id,
												name: user.linkedClient.name,
												contact_name: user.linkedClient.contact_name,
												tax_id: user.linkedClient.tax_id,
												address: user.linkedClient.address,
												city: user.linkedClient.city,
												postal_code: user.linkedClient.postal_code,
												province: user.linkedClient.province,
												visit_window_start_time:
													user.linkedClient.visit_window_start_time,
												visit_window_end_time:
													user.linkedClient.visit_window_end_time,
												notes: user.linkedClient.notes,
											}
										: null
								}
							/>
						</div>
					</section>
				</PageTransition>
			</div>

			<BottomNav
				props={{
					LandingPage: landingPage,
					settingsHref:
						role === "commercial" ? "/commercials/settings" : null,
				}}
			/>
		</main>
	);
}
