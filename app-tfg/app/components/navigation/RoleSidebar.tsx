"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import type { ComponentType, CSSProperties } from "react";
import {
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
	UserManagementIcon,
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
	clientTierBadge?: {
		code: string;
		name: string;
	} | null;
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
	users: UserManagementIcon,
	visits: VisitsIcon,
};

const clientTierBadgeStyles: Record<
	string,
	{
		backgroundImage: string;
		borderColor: string;
		boxShadow: string;
		color: string;
		textShadow?: string;
	}
> = {
	silver: {
		backgroundImage:
			"linear-gradient(135deg, #f8fafc 0%, #b6bcc6 18%, #ffffff 34%, #7d8794 52%, #edf1f5 72%, #9ca3af 100%)",
		borderColor: "rgba(148, 163, 184, 0.72)",
		boxShadow:
			"inset 0 1px 0 rgba(255,255,255,0.9), inset 0 -1px 0 rgba(15,23,42,0.12), 0 6px 16px rgba(100,116,139,0.18)",
		color: "#111827",
	},
	gold: {
		backgroundImage:
			"linear-gradient(135deg, #fff7cc 0%, #d3a633 18%, #fff3a3 36%, #b98212 55%, #f7d56d 76%, #8f5f08 100%)",
		borderColor: "rgba(180, 124, 20, 0.65)",
		boxShadow:
			"inset 0 1px 0 rgba(255,255,255,0.78), inset 0 -1px 0 rgba(120,53,15,0.2), 0 6px 16px rgba(180,83,9,0.2)",
		color: "#241404",
	},
	platinum: {
		backgroundImage:
			"linear-gradient(135deg, #eaffff 0%, #2ab8bc 18%, #cffff8 38%, #0f8f99 58%, #f5ffff 78%, #34d4c8 100%)",
		borderColor: "rgba(20, 184, 166, 0.6)",
		boxShadow:
			"inset 0 1px 0 rgba(255,255,255,0.82), inset 0 -1px 0 rgba(13,148,136,0.22), 0 6px 16px rgba(20,184,166,0.2)",
		color: "#042f2e",
	},
};

function getClientTierBadgeStyle(code: string | null | undefined) {
	const normalizedCode = String(code ?? "").trim().toLowerCase();

	return clientTierBadgeStyles[normalizedCode] ?? clientTierBadgeStyles.silver;
}

function isActiveHref(pathname: string, href: string) {
	if (pathname === href) {
		return true;
	}

	if (href === "/admin" || href === "/clients" || href === "/commercials") {
		return false;
	}

	return pathname.startsWith(`${href}/`);
}

async function handleLogout() {
	try {
		await fetch("/api/auth/logout", {
			method: "POST",
		});
	} catch (error) {
		console.error("[logout] error llamando a la API:", error);
	}

	await signOut({ redirect: false });
	window.location.href = "/login";
}

export default function RoleSidebar({
	role,
	userName,
	userEmail,
	userImageUrl,
	clientTierBadge,
}: RoleSidebarProps) {
	const pathname = usePathname();
	const [isMobileOpen, setIsMobileOpen] = useState(false);
	const [isMobileMounted, setIsMobileMounted] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const closeTimeoutRef = useRef<number | null>(null);
	const labels = roleSidebarLabels[role];
	const sections = roleSidebarSections[role];
	const roleDisplayName = roleDisplayNames[role];
	const showClientTierBadge = Boolean(
		role === "client" &&
			clientTierBadge &&
			String(clientTierBadge.code).trim().toLowerCase() !== "none",
	);
	let activeHref: string | null = null;

	for (const section of sections) {
		for (const item of section.items) {
			if (
				isActiveHref(pathname, item.href) &&
				(!activeHref || item.href.length > activeHref.length)
			) {
				activeHref = item.href;
			}
		}
	}
	const sidebarStyle = {
		"--role-sidebar-width": isExpanded ? "18rem" : "5rem",
		"--sidebar-motion-duration": `${MOBILE_SIDEBAR_ANIMATION_MS}ms`,
	} as CSSProperties;

	useEffect(() => {
		document.documentElement.style.setProperty(
			"--role-sidebar-modal-offset",
			isExpanded ? "18rem" : "5rem",
		);

		return () => {
			document.documentElement.style.removeProperty(
				"--role-sidebar-modal-offset",
			);
		};
	}, [isExpanded]);

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
				<div
					className={`relative flex items-center gap-3 border-b border-slate-200/70 py-4 ${
						isExpanded
							? "justify-between px-4"
							: "justify-between px-4 lg:justify-center lg:px-0"
					}`}
				>
					<div
						className={`flex min-w-0 items-center ${
							isExpanded
								? "gap-3 pr-11"
								: "gap-3 lg:w-full lg:justify-center lg:gap-0 lg:pr-0"
						}`}
					>
						<button
							type="button"
							className="group/logo relative grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-950/10 ring-1 ring-slate-200 transition-[transform,box-shadow,background-color] duration-200 ease-out hover:-translate-y-0.5 hover:bg-slate-950 focus:outline-none focus-visible:-translate-y-0.5 focus-visible:bg-slate-950 focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
							onClick={() => setIsExpanded((value) => !value)}
							aria-label={isExpanded ? "Plegar menú" : "Desplegar menú"}
							aria-expanded={isExpanded}
							aria-controls="role-sidebar"
						>
							<Image
								src="/icons/icon-192.png"
								alt="KIN"
								width={44}
								height={44}
								className="absolute inset-0 m-auto h-11 w-11 object-contain object-center transition-[opacity,transform] duration-200 ease-out group-hover/logo:scale-90 group-hover/logo:opacity-0 group-focus-visible/logo:scale-90 group-focus-visible/logo:opacity-0"
								sizes="44px"
							/>
							<span
								aria-hidden="true"
								className="pointer-events-none absolute inset-0 z-10 grid scale-75 place-items-center text-white opacity-0 transition-[opacity,transform] duration-200 ease-out group-hover/logo:scale-100 group-hover/logo:opacity-100 group-focus-visible/logo:scale-100 group-focus-visible/logo:opacity-100"
							>
								<span
									className={`relative h-5 w-5 text-[0px] transition-transform duration-200 before:absolute before:left-1/2 before:top-1/2 before:block before:h-2.5 before:w-2.5 before:-translate-x-1/2 before:-translate-y-1/2 before:rotate-45 before:border-r-2 before:border-t-2 before:border-white before:content-[''] ${
										isExpanded ? "rotate-180" : ""
									}`}
								/>
							</span>
						</button>
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
							<div className="flex min-w-0 items-center gap-2">
								<p className="min-w-0 truncate text-sm font-bold text-slate-950">
									{userName || labels.title}
								</p>
								{showClientTierBadge && clientTierBadge ? (
									<span
										className="relative inline-flex shrink-0 overflow-hidden rounded-full border px-2 py-0.5 text-xs font-black uppercase leading-none tracking-[0.12em]"
										style={getClientTierBadgeStyle(clientTierBadge.code)}
										title={`Rango ${clientTierBadge.name}`}
									>
										<span className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.7)_0%,rgba(255,255,255,0)_34%,rgba(255,255,255,0.55)_52%,rgba(255,255,255,0)_70%)] opacity-80" />
										<span className="relative">{clientTierBadge.name}</span>
									</span>
								) : null}
							</div>
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
									const isActive = item.href === activeHref;

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
