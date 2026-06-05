import { redirect } from "next/navigation";
import PageTransition from "@/app/components/animations/PageTransition";
import HeaderTitle from "@/app/components/basics/HeaderTitle";
import ClientTierBadgeCard from "@/app/components/clients/ClientTierBadgeCard";
import RoleSidebar from "@/app/components/navigation/RoleSidebar";
import type { RoleSidebarRole } from "@/app/components/navigation/role-sidebar-items";
import UserProfileCard from "@/app/components/users/UserProfileCard";
import { requireUserSession } from "@/lib/auth/require-session";
import { getClientTierOverview } from "@/lib/typeorm/services/clients/client-tier";
import { listPromotionsForUser } from "@/lib/typeorm/services/communications/communications";
import { getUserById } from "@/lib/typeorm/services/users/user";

export default async function ProfilePage() {
	const session = await requireUserSession();
	const user = await getUserById(session.user.id);

	if (!user) {
		redirect("/");
	}

	const role = user.role.code as RoleSidebarRole;
	const [clientTierOverview, clientPromotions] =
		role === "client"
			? await Promise.all([
					getClientTierOverview(session.user.id),
					listPromotionsForUser({
						userId: session.user.id,
						role: "client",
					}),
				])
			: [null, []];

	return (
		<main className="app-bg min-h-[100svh] w-full text-slate-800">
			<div className="lg:flex lg:min-h-[100svh]">
				<RoleSidebar
					role={role}
					userName={user.name ?? session.user.name}
					userEmail={user.email ?? session.user.email}
					userImageUrl={user.profile_image_url ?? session.user.image}
				/>

				<div className="min-w-0 flex-1 px-4 pt-4 pb-6 md:pb-8 lg:px-5 lg:pt-4 2xl:px-6">
					<div className="mx-auto flex min-h-[100svh] w-full max-w-[1680px] flex-col">
						<div className="lg:hidden">
							<HeaderTitle
								title="Kinestilistas"
								subtitle="Mi perfil"
							/>
						</div>

						<PageTransition>
							<section className="w-full">
								{clientTierOverview ? (
									<div className="mb-3">
										<ClientTierBadgeCard
											tier={clientTierOverview}
											activePromotionsCount={clientPromotions.length}
											compact
										/>
									</div>
								) : null}

								<UserProfileCard
									mode="edit"
									layout="compact"
									title="Mi perfil"
									subtitle="Consulta y edita tus datos personales y la información operativa asociada."
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
											code: user.role.code as
												| "admin"
												| "client"
												| "commercial",
										},
										status: {
											code: user.status.code as
												| "active"
												| "inactive"
												| "blocked",
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
													lat: user.linkedClient.lat,
													lng: user.linkedClient.lng,
													visit_window_start_time:
														user.linkedClient.visit_window_start_time,
													visit_window_end_time:
														user.linkedClient.visit_window_end_time,
													notes: user.linkedClient.notes,
												}
											: null
									}
								/>
							</section>
						</PageTransition>
					</div>
				</div>
			</div>
		</main>
	);
}
