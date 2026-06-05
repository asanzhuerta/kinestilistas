"use client";

import Image from "next/image";
import { usePageHeaderRegistration } from "@/app/components/layout/PageHeaderContext";

type HeaderTitleProps = {
	title: string;
	subtitle?: string;
	noGlass?: boolean;
};

export default function HeaderTitle({
	title,
	subtitle = "Alta Peluqueria & Estetica",
	noGlass = false,
}: HeaderTitleProps) {
	const isRegisteredInShellHeader = usePageHeaderRegistration({ title, subtitle });

	if (isRegisteredInShellHeader) {
		return null;
	}

	return (
		<header
			className={`relative mb-4 rounded-2xl px-6 py-4 text-center ${
				noGlass ? "bg-white/80" : "glass-header"
			}`}
		>
			<h1 className="text-1xl text-center uppercase tracking-widest text-black sm:text-3xl">
				{title}
			</h1>
			<p className="mt-1 text-center text-xs uppercase tracking-[0.18em] text-black/80 sm:text-[15px]">
				{subtitle}
			</p>
			{noGlass ? (
				<div className="absolute right-6 top-4">
					<Image
						src="/profile-image.png"
						alt="Profile"
						width={40}
						height={40}
						className="h-10 w-10 rounded-full"
					/>
				</div>
			) : null}
		</header>
	);
}
