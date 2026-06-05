"use client";

import { usePageHeaderRegistration } from "@/app/components/layout/PageHeaderContext";

type H1TitleProps = {
	title: string;
	subtitle: string;
	noGlass?: boolean;
};

export default function H1Title({
	title,
	subtitle,
	noGlass = false,
}: H1TitleProps) {
	const isRegisteredInShellHeader = usePageHeaderRegistration({ title, subtitle });

	if (isRegisteredInShellHeader) {
		return null;
	}

	return (
		<header
			className={`mb-4 rounded-2xl px-6 py-4 text-center ${
				noGlass ? "bg-white/80" : "glass-header"
			}`}
		>
			<h1 className="text-1xl text-center uppercase tracking-widest text-black sm:text-3xl">
				{title}
			</h1>
			<p className="mt-1 text-center text-xs uppercase tracking-[0.18em] text-black/80 sm:text-[15px]">
				{subtitle}
			</p>
		</header>
	);
}
