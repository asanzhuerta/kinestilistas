import type { Metadata, Viewport } from "next";
import AppBackgroundCrossfade from "./components/layout/AppBackgroundCrossfade";
import ServiceWorkerRegister from "./components/ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
	title: "Kinestilistas",
	description: "Aplicación profesional para peluquerías",
	// Configuración para PWA y Apple Web App
	appleWebApp: {
		capable: true,
		statusBarStyle: "default",
		title: "Kinestilistas",
	},
	icons: {
		icon: [
			{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
			{ url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
		],
		apple: [{ url: "/icons/apple-touch-icon.png" }],
	},
};

// Configuración de viewport para asegurar que la aplicación se vea bien en dispositivos móviles
export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	viewportFit: "cover",
};

// Layout raíz que envuelve toda la aplicación
export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="es">
			<body className="antialiased">
				<ServiceWorkerRegister />
				<AppBackgroundCrossfade />

				{children}
			</body>
		</html>
	);
}
