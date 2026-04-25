import BottomNav from "@/app/components/basics/BottomNav";
import PageTransition from "../components/animations/PageTransition";

// Layout específico para la sección de clientes
export default function ClientLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<main className="app-bg flex min-h-screen w-full flex-col text-slate-800">
			<div className="bg-overlay fixed inset-0 -z-10" />
			
			<section className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
				<PageTransition>{children}</PageTransition>
			</section>

			<BottomNav props={{ LandingPage: "/clients" }} />
		</main>
	);
}
