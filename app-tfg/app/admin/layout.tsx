import ShellHeader from "@/app/components/layout/ShellHeader";
import { PageHeaderProvider } from "@/app/components/layout/PageHeaderContext";
import RoleSidebar from "@/app/components/navigation/RoleSidebar";
import { requireAdminSession } from "@/lib/auth/require-session";
import { getUserById } from "@/lib/typeorm/services/users/user";

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	const session = await requireAdminSession();
	const user = await getUserById(session.user.id);

	return (
		<main className="app-bg app-bg-admin min-h-screen w-full text-slate-800">
			<div className="bg-overlay fixed inset-0 -z-10" />

			<PageHeaderProvider>
				<div className="lg:flex">
					<RoleSidebar
						role="admin"
						userName={user?.name ?? session.user.name}
						userEmail={user?.email ?? session.user.email}
						userImageUrl={user?.profile_image_url ?? session.user.image}
					/>
					<section className="min-w-0 flex-1 px-4 pt-20 pb-8 md:px-6 md:pb-10 lg:pt-4">
						<ShellHeader />
						{children}
					</section>
				</div>
			</PageHeaderProvider>
		</main>
	);
}
