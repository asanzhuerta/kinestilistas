import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
	const shortcutIcon = [
		{
			src: "/icons/icon-192.png",
			sizes: "192x192",
			type: "image/png",
		},
	];

	return {
		name: "KinEstilistas",
		short_name: "KinEstilistas",
		description: "Aplicación de gestión comercial y operativa de KinEstilistas",
		start_url: "/",
		display: "standalone",
		background_color: "#ffffff",
		theme_color: "#ffffff",
		orientation: "portrait",
		icons: [
			{
				src: "/icons/icon-192.png",
				sizes: "192x192",
				type: "image/png",
			},
			{
				src: "/icons/icon-512.png",
				sizes: "512x512",
				type: "image/png",
			},
			{
				src: "/icons/icon-512-maskable.png",
				sizes: "512x512",
				type: "image/png",
				purpose: "maskable",
			},
		],
		shortcuts: [
			{
				name: "Panel principal",
				short_name: "Panel",
				description: "Abrir el panel correspondiente al perfil activo.",
				url: "/shortcuts/panel",
				icons: shortcutIcon,
			},
			{
				name: "Mi perfil",
				short_name: "Perfil",
				description: "Consultar y editar los datos del usuario.",
				url: "/profile",
				icons: shortcutIcon,
			},
			{
				name: "Catálogo",
				short_name: "Catálogo",
				description: "Acceder al catálogo según el rol de la sesión.",
				url: "/shortcuts/catalog",
				icons: shortcutIcon,
			},
			{
				name: "Pedidos",
				short_name: "Pedidos",
				description: "Abrir la zona de pedidos del perfil activo.",
				url: "/shortcuts/orders",
				icons: shortcutIcon,
			},
			{
				name: "Rutas",
				short_name: "Rutas",
				description: "Abrir rutas comerciales u operación según el perfil.",
				url: "/shortcuts/routes",
				icons: shortcutIcon,
			},
		],
	};
}
