"use client";

import { usePageHeaderContext } from "./PageHeaderContext";

type ShellHeaderProps = {
	className?: string;
};

export default function ShellHeader({ className = "" }: ShellHeaderProps) {
	const context = usePageHeaderContext();
	const pageHeader = context?.pageHeader ?? null;
	const hasPageHeader =
		Boolean(pageHeader?.title?.trim()) || Boolean(pageHeader?.subtitle?.trim());

	return (
		<header
			className={`glass-header mb-4 rounded-2xl px-6 py-4 ${className}`.trim()}
		>
			<div
				className={
					hasPageHeader
						? "flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(260px,360px)_minmax(0,1fr)] lg:items-center lg:gap-8"
						: "flex justify-center"
				}
			>
				<div
					className={
						hasPageHeader
							? "text-center lg:border-r lg:border-black/10 lg:pr-8 lg:text-left"
							: "text-center"
					}
				>
					<h1 className="text-1xl uppercase tracking-widest text-black sm:text-3xl">
						Kinestilistas
					</h1>
					<p className="mt-1 text-xs uppercase tracking-[0.18em] text-black/80 sm:text-[15px]">
						Alta Peluqueria &amp; Estetica
					</p>
				</div>

				{hasPageHeader ? (
					<div className="min-w-0 text-center lg:text-left">
						<h2 className="text-xl font-semibold uppercase tracking-[0.14em] text-black sm:text-2xl xl:text-3xl">
							{pageHeader?.title}
						</h2>
						{pageHeader?.subtitle?.trim() ? (
							<p className="mt-2 text-xs uppercase tracking-[0.18em] text-black/80 sm:text-[13px] xl:text-[15px]">
								{pageHeader.subtitle}
							</p>
						) : null}
					</div>
				) : null}
			</div>
		</header>
	);
}
