import Link from "next/link";
import H1Title from "@/app/components/H1Title";
import type { PromotionView } from "./communication-view-types";

type Props = {
	title: string;
	subtitle: string;
	backHref: string;
	promotions: PromotionView[];
};

function formatDate(value: string) {
	return new Intl.DateTimeFormat("es-ES", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(new Date(`${value}T00:00:00`));
}

export default function PromotionsOverview({
	title,
	subtitle,
	backHref,
	promotions,
}: Props) {
	return (
		<div className="space-y-6">
			<H1Title title={title} subtitle={subtitle} />

			<div className="flex justify-start">
				<Link
					href={backHref}
					className="rounded-xl border border-slate-200 bg-white/75 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white"
				>
					Volver
				</Link>
			</div>

			<section className="rounded-3xl border border-white/30 bg-white/70 p-6 shadow-xl backdrop-blur">
				<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
					M6 / Comunicacion comercial
				</p>
				<h2 className="mt-2 text-2xl font-bold text-slate-900">
					Promociones vigentes
				</h2>
				<p className="mt-2 max-w-3xl text-sm text-slate-600">
					Consulta las campanas activas segun tu rol y, en el caso de clientes,
					segun el rango comercial asignado por administracion.
				</p>
			</section>

			{promotions.length ? (
				<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
					{promotions.map((promotion) => (
						<article
							key={promotion.id}
							className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm"
						>
							<div className="flex items-start justify-between gap-3">
								<div>
									<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
										{promotion.promotionType}
									</p>
									<h3 className="mt-1 text-lg font-semibold text-slate-900">
										{promotion.title}
									</h3>
								</div>
								<span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
									Activa
								</span>
							</div>
							<p className="mt-3 text-sm text-slate-600">
								{promotion.description}
							</p>
							<p className="mt-3 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white">
								{promotion.benefit}
							</p>
							<p className="mt-3 text-xs text-slate-500">
								Disponible hasta {formatDate(promotion.endDate)}
							</p>
							<p className="mt-2 text-xs text-slate-500">
								Ambito:{" "}
								{promotion.clientName ??
									promotion.customerSegmentName ??
									"General"}
								{promotion.productName ? ` · ${promotion.productName}` : ""}
								{promotion.productLineName
									? ` · ${promotion.productLineName}`
									: ""}
							</p>
						</article>
					))}
				</div>
			) : (
				<div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-sm text-slate-500">
					No hay promociones activas para mostrar ahora mismo.
				</div>
			)}
		</div>
	);
}
