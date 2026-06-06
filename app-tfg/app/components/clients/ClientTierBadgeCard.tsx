import Link from "next/link";
import type {
	ClientTierCode,
	ClientTierOverview,
} from "@/lib/typeorm/services/clients/client-tier";

type ClientTierBadgeCardProps = {
	tier: ClientTierOverview;
	activePromotionsCount?: number;
	compact?: boolean;
};

const tierStyles: Record<
	ClientTierCode,
	{
		card: string;
		pill: string;
		orb: string;
		label: string;
	}
> = {
	platinum: {
		card: "border-cyan-100 bg-[linear-gradient(135deg,rgba(236,254,255,0.92),rgba(255,255,255,0.72),rgba(203,213,225,0.45))]",
		pill: "border-cyan-200 bg-cyan-50 text-cyan-800",
		orb: "from-cyan-200 via-white to-slate-300",
		label: "PLATINO",
	},
	gold: {
		card: "border-amber-100 bg-[linear-gradient(135deg,rgba(255,251,235,0.94),rgba(255,255,255,0.76),rgba(251,191,36,0.30))]",
		pill: "border-amber-200 bg-amber-50 text-amber-800",
		orb: "from-amber-200 via-yellow-50 to-orange-300",
		label: "ORO",
	},
	silver: {
		card: "border-slate-200 bg-[linear-gradient(135deg,rgba(248,250,252,0.94),rgba(255,255,255,0.78),rgba(148,163,184,0.28))]",
		pill: "border-slate-200 bg-slate-50 text-slate-700",
		orb: "from-slate-200 via-white to-slate-400",
		label: "PLATA",
	},
	none: {
		card: "border-slate-200 bg-white/80",
		pill: "border-slate-200 bg-white text-slate-600",
		orb: "from-slate-100 via-white to-slate-200",
		label: "SIN RANGO",
	},
};

export default function ClientTierBadgeCard({
	tier,
	activePromotionsCount = 0,
	compact = false,
}: ClientTierBadgeCardProps) {
	const styles = tierStyles[tier.code];

	return (
		<aside
			className={`glass-card relative overflow-hidden rounded-3xl border shadow-xl ${styles.card} ${
				compact ? "p-4" : "p-5"
			}`}
		>
			<div
				className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${styles.orb} opacity-70 blur-sm`}
				aria-hidden="true"
			/>

			<div className="relative flex items-start justify-between gap-4">
				<div>
					<p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
						Rango comercial
					</p>
					<h2
						className={`mt-2 font-bold text-slate-950 ${
							compact ? "text-lg" : "text-xl"
						}`}
					>
						{tier.description}
					</h2>
				</div>
				<span
					className={`rounded-full border px-3 py-1 text-xs font-bold tracking-[0.18em] ${styles.pill}`}
				>
					{styles.label}
				</span>
			</div>

			{compact ? null : (
				<p className="relative mt-4 text-sm leading-6 text-slate-700">
					{tier.benefitSummary}
				</p>
			)}

			<div
				className={`relative grid gap-2 sm:grid-cols-2 ${
					compact ? "mt-3" : "mt-4 gap-3"
				}`}
			>
				<div className="rounded-2xl border border-white/60 bg-white/65 px-3 py-2">
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
						Promociones
					</p>
					<p
						className={`mt-1 font-bold text-slate-900 ${
							compact ? "text-xl" : "text-2xl"
						}`}
					>
						{activePromotionsCount}
					</p>
				</div>
				<div className="rounded-2xl border border-white/60 bg-white/65 px-3 py-2">
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
						Rangos
					</p>
					<p
						className={`mt-1 font-bold text-slate-900 ${
							compact ? "text-xl" : "text-2xl"
						}`}
					>
						{tier.assignedSegments.length}
					</p>
				</div>
			</div>

			{compact ? null : (
				<p className="relative mt-4 text-xs leading-5 text-slate-500">
					{tier.nextStep}
				</p>
			)}

			<div className="relative mt-5 flex flex-wrap gap-2">
				<Link
					href="/clients/promotions"
					className="rounded-full bg-slate-950 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
				>
					Ver ventajas
				</Link>
			</div>
		</aside>
	);
}
