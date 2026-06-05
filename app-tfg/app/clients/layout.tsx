import { requireClientSession } from "@/lib/auth/require-session";
import PageTransition from "../components/animations/PageTransition";
import ShellHeader from "../components/layout/ShellHeader";
import { PageHeaderProvider } from "../components/layout/PageHeaderContext";
import RoleSidebar from "../components/navigation/RoleSidebar";
import { getUserById } from "@/lib/typeorm/services/users/user";

// Layout específico para la sección de clientes
export default async function ClientLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await requireClientSession();
	const user = await getUserById(session.user.id);

	return (
		<main className="app-bg app-bg-client flex min-h-screen w-full flex-col text-slate-800">
			<div className="bg-overlay fixed inset-0 -z-10" />

			<PageHeaderProvider>
				<div className="lg:flex lg:min-h-screen">
					<RoleSidebar
						role="client"
						userName={user?.name ?? session.user.name}
						userEmail={user?.email ?? session.user.email}
						userImageUrl={user?.profile_image_url ?? session.user.image}
					/>
					<div className="min-w-0 flex-1 px-6 pt-20 pb-8 md:pb-10 lg:pt-4">
						<ShellHeader />
						<section className="flex-1 overflow-y-auto">
							<PageTransition>{children}</PageTransition>
						</section>
					</div>
				</div>
			</PageHeaderProvider>
		</main>
	);
}
