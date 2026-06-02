import BottomNav from "@/app/components/basics/BottomNav";
import ShellHeader from "@/app/components/layout/ShellHeader";
import { PageHeaderProvider } from "@/app/components/layout/PageHeaderContext";
import { requireAdminSession } from "@/lib/auth/require-session";

export default async function AdminLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	await requireAdminSession();

	return (
		<main className="app-bg min-h-screen w-full text-slate-800">
			<div className="bg-overlay fixed inset-0 -z-10" />

			<PageHeaderProvider>
				<section className="px-4 pt-4 pb-28 md:px-6 md:pb-32">
					<ShellHeader />
					{children}
				</section>
			</PageHeaderProvider>

			<BottomNav props={{
				LandingPage: "/admin"
			}} />
		</main>
	);
}
