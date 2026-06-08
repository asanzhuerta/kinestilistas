import type { ReactNode } from "react";
import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";

type Props = {
	title: string;
	subtitle: string;
	backHref: string;
	backLabel: string;
	children: ReactNode;
};

export default function CatalogAdminEditShell({
	title,
	subtitle,
	children,
}: Props) {
	return (
		<PageTransition>
			<div className="space-y-6">
				<div className="flex justify-end">
					<span className="rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-sky-700">
						Modo edición
					</span>
				</div>

				<H1Title title={title} subtitle={subtitle} />

				<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					{children}
				</section>
			</div>
		</PageTransition>
	);
}
