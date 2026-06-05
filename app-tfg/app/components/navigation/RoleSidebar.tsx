"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import type { ComponentType, CSSProperties } from "react";
import {
	ActivityIcon,
	CatalogIcon,
	ChatIcon,
	ClientsIcon,
	ColorIcon,
	HomeIcon,
	LogoutIcon,
	OrderIcon,
	PaymentsIcon,
	ProfileIcon,
	PromotionsIcon,
	ReportsIcon,
	RouteIcon,
	SettingsIcon,
	TrainingIcon,
	VisitsIcon,
} from "@/app/components/IconsSVGs";
import UserAvatar from "@/app/components/users/UserAvatar";
import {
	roleSidebarLabels,
	roleSidebarSections,
	type RoleSidebarIcon,
	type RoleSidebarRole,
} from "./role-sidebar-items";

type RoleSidebarProps = {
	role: RoleSidebarRole;
	userName?: string | null;
	userEmail?: string | null;
	userImageUrl?: string | null;
};

const MOBILE_SIDEBAR_ANIMATION_MS = 320;

const roleDisplayNames: Record<RoleSidebarRole, string> = {
	admin: "ADMINISTRADOR",
	commercial: "COMERCIAL",
	client: "PROFESIONAL",
};

const iconMap: Record<
	RoleSidebarIcon,
	ComponentType<{ className?: string }>
> = {
	activity: ActivityIcon,
	catalog: CatalogIcon,
	chat: ChatIcon,
	clients: ClientsIcon,
	color: ColorIcon,
	home: HomeIcon,
	orders: OrderIcon,
	payments: PaymentsIcon,
	profile: ProfileIcon,
	promotions: PromotionsIcon,
	reports: ReportsIcon,
	route: RouteIcon,
	settings: SettingsIcon,
	training: TrainingIcon,
	visits: VisitsIcon,
};

function isActiveHref(pathname: string, href: string) {
	if (pathname === href) {
		return true;
	}

	if (href === "/admin" || href === "/clients" || href === "/commercials") {
		return false;
	}

	return pathname.startsWith(`${href}/`);
}

export default function RoleSidebar({
	role,
	userName,
	userEmail,
	userImageUrl,
}: RoleSidebarProps) {
	const pathname = usePathname();
	const [isMobileOpen, setIsMobileOpen] = useState(false);
	const [isMobileMounted, setIsMobileMounted] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const closeTimeoutRef = useRef<number | null>(null);
	const labels = roleSidebarLabels[role];
	const sections = roleSidebarSections[role];
	const roleDisplayName = roleDisplayNames[role];
	const sidebarStyle = {
		"--role-sidebar-width": isExpanded ? "18rem" : "5rem",
		"--sidebar-motion-duration": `${MOBILE_SIDEBAR_ANIMATION_MS}ms`,
	} as CSSProperties;

	useEffect(() => {
		return () => {
			if (closeTimeoutRef.current !== null) {
				window.clearTimeout(closeTimeoutRef.current);
			}
		};
	}, []);

	const clearMobileCloseTimeout = () => {
		if (closeTimeoutRef.current !== null) {
			window.clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}
	};

	const openMobileSidebar = () => {
		clearMobileCloseTimeout();
		setIsMobileMounted(true);
		window.requestAnimationFrame(() => setIsMobileOpen(true));
	};

	const closeMobileSidebar = () => {
		clearMobileCloseTimeout();
		setIsMobileOpen(false);
		closeTimeoutRef.current = window.setTimeout(() => {
			setIsMobileMounted(false);
			closeTimeoutRef.current = null;
		}, MOBILE_SIDEBAR_ANIMATION_MS);
	};

	const handleLogout = async () => {
		try {
			await fetch("/api/auth/logout", {
				method: "POST",
			});
		} catch (error) {
			console.error("[logout] error llamando a la API:", error);
		}

		await signOut({ redirect: false });
		window.location.href = "/login";
	};

	return (
		<>
			<button
				type="button"
				data-sidebar-motion="true"
				className={`fixed left-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[80] rounded-full border border-white/60 bg-white/72 px-3.5 py-2.5 text-[0.68rem] font-black uppercase tracking-[0.22em] text-slate-950 shadow-xl shadow-slate-950/10 backdrop-blur-xl transition-[opacity,transform,background-color] duration-200 ease-out hover:bg-white lg:hidden ${
					isMobileMounted
						? "pointer-events-none -translate-y-2 scale-95 opacity-0"
						: "translate-y-0 scale-100 opacity-100"
				}`}
				onClick={openMobileSidebar}
				aria-label="Abrir menú de navegación"
				aria-expanded={isMobileOpen}
				aria-controls="role-sidebar"
				tabIndex={isMobileMounted ? -1 : undefined}
			>
				Menu
			</button>

			<button
				type="button"
				data-sidebar-motion="true"
				className={`fixed inset-0 z-[55] bg-slate-950/35 backdrop-blur-sm transition-opacity duration-300 ease-out lg:hidden ${
					isMobileOpen
						? "opacity-100"
						: "pointer-events-none opacity-0"
				}`}
				onClick={closeMobileSidebar}
				aria-label="Cerrar menú"
				tabIndex={isMobileOpen ? undefined : -1}
			/>

			<aside
				id="role-sidebar"
				data-sidebar-motion="true"
				style={sidebarStyle}
				aria-label="Menú principal por rol"
				className={`group fixed inset-y-0 left-0 z-[60] flex w-80 flex-col border-r border-white/40 bg-white/90 shadow-2xl backdrop-blur-xl transition-[opacity,transform,width] duration-[320ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform lg:sticky lg:top-0 lg:z-30 lg:h-screen lg:w-[var(--role-sidebar-width)] lg:shrink-0 ${
					isMobileMounted ? "visible" : "invisible lg:visible"
				} ${
					isMobileOpen
						? "translate-x-0 opacity-100"
						: "-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100"
				}`}
			>
				<div className="relative flex items-center justify-between gap-3 border-b border-slate-200/70 px-4 py-4">
					<div
						className={`flex min-w-0 items-center ${
							isExpanded
								? "gap-3 pr-11"
								: "gap-3 lg:w-full lg:justify-center lg:gap-0 lg:pr-0"
						}`}
					>
						<div
							aria-hidden="true"
							className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-950/10 ring-1 ring-slate-200"
						>
							<Image
								src="/icons/icon-192.png"
								alt=""
								width={44}
								height={44}
								className="h-11 w-11 object-contain object-center"
								sizes="44px"
							/>
						</div>
						<div
							className={`min-w-0 overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-out ${
								isExpanded
									? "max-w-48 translate-x-0 opacity-100"
									: "max-w-48 translate-x-0 opacity-100 lg:max-w-0 lg:-translate-x-2 lg:opacity-0"
							}`}
						>
							<p className="whitespace-nowrap text-sm font-black uppercase tracking-[0.18em] text-slate-950">
								Kinestilistas
							</p>
							<p className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
								{roleDisplayName}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-2">
						<button
							type="button"
							className="absolute right-3 top-1/2 hidden h-9 w-9 -translate-y-1/2 scale-90 items-center justify-center rounded-full border border-slate-200 bg-white/75 p-0 text-xs font-bold text-slate-700 opacity-0 shadow-sm transition-[opacity,transform,background-color,color] duration-200 hover:bg-slate-950 hover:text-white focus-visible:scale-100 focus-visible:opacity-100 lg:inline-flex lg:group-hover:scale-100 lg:group-hover:opacity-100"
							onClick={() => setIsExpanded((value) => !value)}
							aria-label={isExpanded ? "Plegar menú" : "Desplegar menú"}
						>
							{isExpanded ? "<" : ">"}
						</button>
						<button
							type="button"
							className="rounded-full border border-slate-200 bg-white/75 px-3 py-2 text-xs font-bold text-slate-700 shadow-sm lg:hidden"
							onClick={closeMobileSidebar}
							aria-label="Cerrar menú"
						>
							X
						</button>
					</div>
				</div>

				<div className="border-b border-slate-200/70 px-4 py-4">
					<div
						className={`flex items-center ${
							isExpanded ? "gap-3" : "gap-3 lg:justify-center lg:gap-0"
						}`}
					>
						<UserAvatar
							name={userName}
							imageUrl={userImageUrl}
							size="sm"
							className="h-11 w-11 shrink-0 border border-white/80 shadow-sm"
						/>
						<div
							className={`min-w-0 overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-out ${
								isExpanded
									? "max-w-48 translate-x-0 opacity-100"
									: "max-w-48 translate-x-0 opacity-100 lg:max-w-0 lg:-translate-x-2 lg:opacity-0"
							}`}
						>
							<p className="truncate text-sm font-bold text-slate-950">
								{userName || labels.title}
							</p>
							<p className="truncate text-xs text-slate-500">
								{userEmail || labels.title}
							</p>
						</div>
					</div>
				</div>

				<nav
					aria-label="Navegación principal"
					className="role-sidebar-scroll min-h-0 flex-1 space-y-5 overflow-y-auto px-3 py-4"
				>
					{sections.map((section) => (
						<section key={section.title}>
							<p
								className={`overflow-hidden px-3 text-xs font-black uppercase tracking-[0.18em] text-slate-400 transition-[max-height,opacity,transform,margin] duration-300 ease-out ${
									isExpanded
										? "mb-2 max-h-8 translate-x-0 opacity-100"
										: "mb-2 max-h-8 translate-x-0 opacity-100 lg:mb-0 lg:max-h-0 lg:-translate-x-2 lg:opacity-0"
								}`}
							>
								{section.title}
							</p>
							<div className="space-y-1">
								{section.items.map((item) => {
									const Icon = iconMap[item.icon];
									const isActive = isActiveHref(pathname, item.href);

									return (
										<Link
											key={item.href}
											href={item.href}
											onClick={closeMobileSidebar}
											aria-current={isActive ? "page" : undefined}
											aria-label={item.title}
											className={`flex w-full items-center rounded-2xl px-3 py-2.5 text-sm font-semibold transition ${
												isActive
													? "bg-slate-950 text-white shadow-lg shadow-slate-950/15"
													: "text-slate-600 hover:bg-white hover:text-slate-950 hover:shadow-sm"
											} ${
												isExpanded
													? "gap-3 lg:justify-start"
													: "gap-3 lg:h-12 lg:justify-center lg:gap-0 lg:px-0 lg:py-0"
											}`}
										>
											<span className="grid h-8 w-8 shrink-0 place-items-center">
												<Icon className="block h-5 w-5" />
											</span>
											<span
												className={`truncate overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-out ${
													isExpanded
														? "max-w-48 translate-x-0 opacity-100"
														: "max-w-48 translate-x-0 opacity-100 lg:max-w-0 lg:-translate-x-2 lg:opacity-0"
												}`}
											>
												{item.title}
											</span>
										</Link>
									);
								})}
							</div>
						</section>
					))}
				</nav>

				<div className="border-t border-slate-200/70 p-3">
					<button
						type="button"
						onClick={handleLogout}
						className={`flex w-full items-center rounded-2xl px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-rose-50 hover:text-rose-700 ${
							isExpanded
								? "gap-3 lg:justify-start"
								: "gap-3 lg:h-12 lg:justify-center lg:gap-0 lg:px-0 lg:py-0"
						}`}
					>
						<span className="grid h-8 w-8 shrink-0 place-items-center">
							<LogoutIcon className="block h-5 w-5" />
						</span>
						<span
							className={`truncate overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-out ${
								isExpanded
									? "max-w-48 translate-x-0 opacity-100"
									: "max-w-48 translate-x-0 opacity-100 lg:max-w-0 lg:-translate-x-2 lg:opacity-0"
							}`}
						>
							Cerrar sesión
						</span>
					</button>
				</div>
			</aside>
		</>
	);
}
