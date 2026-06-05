"use client";

import { HomeIcon, ProfileIcon, SettingsIcon, LogoutIcon } from "@/app/components/IconsSVGs";
import Link from "next/link";
import { signOut } from "next-auth/react";

type Props = {
	LandingPage?: string;
	settingsHref?: string | null;
};

export default function BottomNav(params: { props?: Props }) {
	const { LandingPage, settingsHref } = params.props || {};
	const landingPageUrl = LandingPage || "/";
	const showSettings = Boolean(settingsHref);
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
		<footer className="glass-header fixed inset-x-0 bottom-0 z-50 border-t border-white/20 px-4 py-3 backdrop-blur-md">
			<div className="mx-auto flex max-w-6xl items-center justify-around gap-2">
				<Link href={landingPageUrl} className="flex-1">
					<div className="flex flex-col items-center opacity-100 transition-opacity hover:opacity-80">
						<HomeIcon className="mb-1 h-6 w-6 text-black" />
						<span className="text-xs uppercase tracking-tight text-black">
							Inicio
						</span>
					</div>
				</Link>

				<Link href="/profile" className="flex-1">
					<div className="flex flex-col items-center opacity-60 transition-opacity hover:opacity-100">
						<ProfileIcon className="mb-1 h-6 w-6 text-black" />
						<span className="text-xs uppercase tracking-tight text-black">
							Perfil
						</span>
					</div>
				</Link>

				{showSettings ? (
					<Link href={settingsHref || "/"} className="flex-1">
						<div className="flex flex-col items-center opacity-60 transition-opacity hover:opacity-100">
							<SettingsIcon className="mb-1 h-6 w-6 text-black" />
							<span className="text-xs uppercase tracking-tight text-black">
								Ajustes
							</span>
						</div>
					</Link>
				) : null}

				<button
					type="button"
					onClick={handleLogout}
					className="flex flex-1 flex-col items-center opacity-60 transition-opacity hover:opacity-100"
				>
					<LogoutIcon className="mb-1 h-6 w-6 text-black" />
					<span className="text-xs uppercase tracking-tight text-black">
						Cerrar sesión
					</span>
				</button>
			</div>
		</footer>
	);
}
