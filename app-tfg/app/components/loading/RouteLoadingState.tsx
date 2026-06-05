type LoadingVariant = "dashboard" | "grid" | "table" | "detail" | "map";

type RouteLoadingStateProps = {
	title: string;
	subtitle?: string;
	variant?: LoadingVariant;
};

const variantConfig: Record<
	LoadingVariant,
	{
		columns: string;
		cards: number;
		cardClassName: string;
		lines: number;
	}
> = {
	dashboard: {
		columns: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
		cards: 8,
		cardClassName: "min-h-36",
		lines: 3,
	},
	grid: {
		columns: "grid-cols-1 md:grid-cols-2 xl:grid-cols-4",
		cards: 8,
		cardClassName: "min-h-80",
		lines: 4,
	},
	table: {
		columns: "grid-cols-1",
		cards: 6,
		cardClassName: "min-h-24",
		lines: 2,
	},
	detail: {
		columns: "grid-cols-1 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]",
		cards: 4,
		cardClassName: "min-h-72",
		lines: 5,
	},
	map: {
		columns: "grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px]",
		cards: 3,
		cardClassName: "min-h-96",
		lines: 4,
	},
};

function SkeletonLine({ widthClassName }: { widthClassName: string }) {
	return (
		<div
			className={`h-3 rounded-full bg-slate-200/90 ${widthClassName}`}
			aria-hidden="true"
		/>
	);
}

function SkeletonCard({
	index,
	lineCount,
	cardClassName,
}: {
	index: number;
	lineCount: number;
	cardClassName: string;
}) {
	const widths = ["w-11/12", "w-3/4", "w-1/2", "w-2/3", "w-5/6"];

	return (
		<article
			className={`rounded-[1.75rem] border border-white/45 bg-white/78 p-5 shadow-xl shadow-slate-950/5 backdrop-blur ${cardClassName}`}
			aria-hidden="true"
		>
			<div className="flex h-full flex-col justify-between gap-6">
				<div className="space-y-3">
					<div className="h-10 w-10 rounded-2xl bg-slate-200/90" />
					<SkeletonLine widthClassName="w-2/3" />
					<SkeletonLine widthClassName="w-11/12" />
					{Array.from({ length: lineCount }).map((_, lineIndex) => (
						<SkeletonLine
							key={`${index}-${lineIndex}`}
							widthClassName={widths[(index + lineIndex) % widths.length]}
						/>
					))}
				</div>

				<div className="flex gap-2">
					<div className="h-9 flex-1 rounded-full bg-slate-200/90" />
					<div className="h-9 w-16 rounded-full bg-slate-200/70" />
				</div>
			</div>
		</article>
	);
}

export default function RouteLoadingState({
	title,
	subtitle = "Preparando la información de esta sección.",
	variant = "dashboard",
}: RouteLoadingStateProps) {
	const config = variantConfig[variant];

	return (
		<section
			className="space-y-6"
			aria-busy="true"
			aria-live="polite"
			aria-label={title}
		>
			<div className="glass-card rounded-[2rem] border border-white/35 bg-white/76 p-6 shadow-xl shadow-slate-950/10 backdrop-blur">
				<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
					Cargando
				</p>
				<h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-slate-950">
					{title}
				</h1>
				<p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
					{subtitle}
				</p>
			</div>

			<div className={`grid gap-4 motion-safe:animate-pulse ${config.columns}`}>
				{Array.from({ length: config.cards }).map((_, index) => (
					<SkeletonCard
						key={index}
						index={index}
						lineCount={config.lines}
						cardClassName={config.cardClassName}
					/>
				))}
			</div>
		</section>
	);
}
