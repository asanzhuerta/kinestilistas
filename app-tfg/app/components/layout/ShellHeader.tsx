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
					<p className="mt-1 text-xs uppercase tracking-[0.18em] text-black/80 sm:text-[15px] lg:hidden">
						{hasPageHeader ? pageHeader?.title : "Alta Peluquería & Estética"}
					</p>
					<p className="mt-1 hidden text-xs uppercase tracking-[0.18em] text-black/80 sm:text-[15px] lg:block">
						Alta Peluquería &amp; Estética
					</p>
				</div>

				{hasPageHeader ? (
					<div className="min-w-0 text-center lg:text-left">
						<h2 className="hidden text-xl font-semibold uppercase tracking-[0.14em] text-black lg:block lg:text-2xl xl:text-3xl">
							{pageHeader?.title}
						</h2>
						{pageHeader?.subtitle?.trim() ? (
							<p className="text-[0.68rem] uppercase tracking-[0.16em] text-black/75 sm:text-xs lg:mt-2 lg:text-[13px] lg:tracking-[0.18em] xl:text-[15px]">
								{pageHeader.subtitle}
							</p>
						) : null}
					</div>
				) : null}
			</div>
		</header>
	);
}
