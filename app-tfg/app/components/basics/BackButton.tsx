"use client";

import { usePathname, useRouter } from "next/navigation";

type Props = {
	label?: string;
	className?: string;
	fallbackHref?: string | null;
};

const DEFAULT_BACK_BUTTON_CLASSES =
	"inline-flex w-fit items-center justify-center rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white";

const ACTION_SEGMENTS = new Set(["edit", "new", "remove"]);

function resolveFallbackHref(pathname: string | null) {
	if (!pathname || pathname === "/") {
		return "/";
	}

	const segments = pathname.split("/").filter(Boolean);

	if (segments.length <= 1) {
		return "/";
	}

	const lastSegment = segments[segments.length - 1];
	const fallbackSegments =
		ACTION_SEGMENTS.has(lastSegment) && segments.length > 2
			? segments.slice(0, -2)
			: segments.slice(0, -1);

	return fallbackSegments.length ? `/${fallbackSegments.join("/")}` : "/";
}

export default function BackButton({
	label = "Volver",
	className,
	fallbackHref,
}: Props) {
	const router = useRouter();
	const pathname = usePathname();
	const resolvedFallbackHref = fallbackHref ?? resolveFallbackHref(pathname);
	const buttonClassName = className?.trim()
		? className
		: DEFAULT_BACK_BUTTON_CLASSES;

	const handleBack = () => {
		if (typeof window !== "undefined" && window.history.length > 1) {
			router.back();
			return;
		}

		router.push(resolvedFallbackHref);
	};

	return (
		<button
			type="button"
			onClick={handleBack}
			className={buttonClassName}
			aria-label={label}
		>
			{label}
		</button>
	);
}
