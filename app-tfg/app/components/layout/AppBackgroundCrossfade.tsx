"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import type { CSSProperties } from "react";

type BackgroundKey = "default" | "login" | "admin" | "client" | "commercial";

type BackgroundSpec = {
	key: BackgroundKey;
	desktop: string;
	mobile: string;
};

const backgrounds: Record<BackgroundKey, BackgroundSpec> = {
	default: {
		key: "default",
		desktop: "/bgs/fondo-default-PC.jpg",
		mobile: "/bgs/fondo-default-Mobile.jpg",
	},
	login: {
		key: "login",
		desktop: "/bgs/fondo-login-PC.jpg",
		mobile: "/bgs/fondo-login-Mobile.jpg",
	},
	admin: {
		key: "admin",
		desktop: "/bgs/fondo-admin-PC.jpg",
		mobile: "/bgs/fondo-admin-Mobile.jpg",
	},
	client: {
		key: "client",
		desktop: "/bgs/fondo-client-PC.jpg",
		mobile: "/bgs/fondo-client-Mobile.jpg",
	},
	commercial: {
		key: "commercial",
		desktop: "/bgs/fondo-commercial-PC.jpg",
		mobile: "/bgs/fondo-commercial-Mobile.jpg",
	},
};

function getBackgroundForPath(pathname: string | null) {
	const path = pathname ?? "/";

	if (
		path === "/login" ||
		path.startsWith("/login/") ||
		path === "/register" ||
		path.startsWith("/register/")
	) {
		return backgrounds.login;
	}

	if (path === "/admin" || path.startsWith("/admin/")) {
		return backgrounds.admin;
	}

	if (path === "/clients" || path.startsWith("/clients/")) {
		return backgrounds.client;
	}

	if (path === "/commercials" || path.startsWith("/commercials/")) {
		return backgrounds.commercial;
	}

	return backgrounds.default;
}

function getLayerStyle(background: BackgroundSpec): CSSProperties {
	return {
		"--app-background-desktop": `url("${background.desktop}")`,
		"--app-background-mobile": `url("${background.mobile}")`,
	} as CSSProperties;
}

export default function AppBackgroundCrossfade() {
	const pathname = usePathname();
	const nextBackground = getBackgroundForPath(pathname);
	const [transitionState, setTransitionState] = useState(() => ({
		active: nextBackground,
		previous: null as BackgroundSpec | null,
		sequence: 0,
	}));

	if (transitionState.active.key !== nextBackground.key) {
		setTransitionState({
			active: nextBackground,
			previous: transitionState.active,
			sequence: transitionState.sequence + 1,
		});
	}

	return (
		<div aria-hidden="true" className="app-background-crossfade">
			{transitionState.previous ? (
				<div
					className="app-background-layer app-background-layer-visible"
					data-background-key={transitionState.previous.key}
					style={getLayerStyle(transitionState.previous)}
				/>
			) : null}
			<div
				key={`${transitionState.active.key}-${transitionState.sequence}`}
				className={`app-background-layer ${
					transitionState.previous
						? "app-background-layer-enter"
						: "app-background-layer-visible"
				}`}
				data-background-key={transitionState.active.key}
				style={getLayerStyle(transitionState.active)}
			/>
		</div>
	);
}
