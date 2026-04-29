import Link from "next/link";

type NavCardProps = {
	title: string;
	icon: React.ReactNode;
	href?: string;
	disabled?: boolean;
};

export default function NavCard({
	title,
	icon,
	href,
	disabled = false,
}: NavCardProps) {
	const content = (
		<>
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

	const className = `glass-card group flex h-24 flex-col items-center justify-center rounded-2xl px-2 py-3 transition ${
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
