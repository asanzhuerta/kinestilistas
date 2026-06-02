import BottomNav from "../components/basics/BottomNav";
import PageTransition from "../components/animations/PageTransition";
import ShellHeader from "../components/layout/ShellHeader";
import { PageHeaderProvider } from "../components/layout/PageHeaderContext";
import { requireCommercialSession } from "@/lib/auth/require-session";

// Layout específico para la sección de comerciales
export default async function CommercialLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	await requireCommercialSession();

	return (
		<main className="app-bg flex min-h-screen w-full flex-col text-slate-800">
			<div className="bg-overlay fixed inset-0 -z-10" />
			<PageHeaderProvider>
				<ShellHeader />
				<section className="flex-1 overflow-y-auto px-6 pt-4 pb-28 md:pb-32">
					<PageTransition>{children}</PageTransition>
				</section>
			</PageHeaderProvider>

			<BottomNav
				props={{
					LandingPage: "/commercials",
					settingsHref: "/commercials/settings",
				}}
			/>
		</main>
	);
}
