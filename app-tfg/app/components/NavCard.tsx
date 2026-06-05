import Link from "next/link";

type NavCardProps = {
	title: string;
	icon: React.ReactNode;
	href?: string;
	disabled?: boolean;
	badgeCount?: number;
	badgeLabel?: string;
};

export default function NavCard({
	title,
	icon,
	href,
	disabled = false,
	badgeCount = 0,
	badgeLabel = "pendientes",
}: NavCardProps) {
	const content = (
		<>
			{badgeCount > 0 ? (
				<span
					aria-label={`${badgeCount} ${badgeLabel}`}
					className="absolute right-2 top-2 rounded-full border border-rose-200 bg-rose-500 px-2 py-0.5 text-xs font-semibold leading-none text-white shadow-sm"
				>
					{badgeCount > 9 ? "9+" : badgeCount}
				</span>
			) : null}

			<div
				className={`mb-3 text-black opacity-90 transition ${
					disabled ? "" : "group-hover:scale-110"
				}`}
			>
				{icon}
			</div>

			<span className="text-center text-xs font-light tracking-wide text-black">
				{title}
			</span>
		</>
	);

	const className = `glass-card group relative flex h-24 flex-col items-center justify-center rounded-2xl px-2 py-3 transition ${
		disabled
			? "cursor-not-allowed opacity-55"
			: "active:scale-[0.97] hover:bg-white/20"
	}`;

	if (disabled || !href) {
		return (
			<div aria-disabled="true" className={className}>
				{content}
			</div>
		);
	}

	return (
		<Link href={href} className={className}>
			{content}
		</Link>
	);
}
