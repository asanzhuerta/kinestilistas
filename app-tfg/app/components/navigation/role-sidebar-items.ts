export type RoleSidebarRole = "admin" | "commercial" | "client";

export type RoleSidebarIcon =
	| "catalog"
	| "chat"
	| "clients"
	| "color"
	| "home"
	| "orders"
	| "payments"
	| "profile"
	| "promotions"
	| "reports"
	| "route"
	| "settings"
	| "training"
	| "users"
	| "visits";

export type RoleSidebarItem = {
	title: string;
	href: string;
	icon: RoleSidebarIcon;
};

export type RoleSidebarSection = {
	title: string;
	items: RoleSidebarItem[];
};

export const roleSidebarLabels: Record<
	RoleSidebarRole,
	{
		title: string;
		subtitle: string;
		homeHref: string;
	}
> = {
	admin: {
		title: "Administrador",
		subtitle: "Gestión global",
		homeHref: "/admin",
	},
	commercial: {
		title: "Comercial",
		subtitle: "Ruta y ventas",
		homeHref: "/commercials",
	},
	client: {
		title: "Cliente",
		subtitle: "Salón profesional",
		homeHref: "/clients",
	},
};

export const roleSidebarSections: Record<
	RoleSidebarRole,
	RoleSidebarSection[]
> = {
	admin: [
		{
			title: "Inicio",
			items: [
				{ title: "Panel admin", href: "/admin", icon: "home" },
				{ title: "Perfil", href: "/profile", icon: "profile" },
			],
		},
		{
			title: "Gestión",
			items: [
				{
					title: "Gestión de usuarios",
					href: "/admin/users",
					icon: "users",
				},
				{
					title: "Gestión de clientes",
					href: "/admin/clients",
					icon: "clients",
				},
			],
		},
		{
			title: "Catálogo",
			items: [
				{ title: "Catálogo", href: "/admin/catalog", icon: "catalog" },
				{
					title: "Cartas color",
					href: "/admin/catalog/color-charts",
					icon: "color",
				},
			],
		},
		{
			title: "Operación",
			items: [
				{ title: "Pedidos", href: "/admin/orders", icon: "orders" },
				{
					title: "Comunicaciones",
					href: "/admin/communications",
					icon: "chat",
				},
				{ title: "Auditoría", href: "/admin/audit", icon: "reports" },
				{
					title: "Configuración",
					href: "/admin/settings",
					icon: "settings",
				},
			],
		},
	],
	commercial: [
		{
			title: "Inicio",
			items: [
				{ title: "Panel comercial", href: "/commercials", icon: "home" },
				{ title: "Perfil", href: "/profile", icon: "profile" },
			],
		},
		{
			title: "Gestión comercial",
			items: [
				{ title: "Clientes", href: "/commercials/clients", icon: "clients" },
				{ title: "Rutas", href: "/commercials/routes", icon: "route" },
				{ title: "Visitas", href: "/commercials/visits", icon: "visits" },
			],
		},
		{
			title: "Ventas",
			items: [
				{ title: "Catálogo", href: "/commercials/catalog", icon: "catalog" },
				{
					title: "Coloración",
					href: "/commercials/coloration",
					icon: "color",
				},
				{ title: "Pedidos", href: "/commercials/orders", icon: "orders" },
				{
					title: "Preparar repartos",
					href: "/commercials/orders/preparation",
					icon: "orders",
				},
			],
		},
		{
			title: "Comunicación",
			items: [
				{
					title: "Promociones",
					href: "/commercials/promotions",
					icon: "promotions",
				},
				{
					title: "Formaciones",
					href: "/commercials/trainings",
					icon: "training",
				},
				{
					title: "Avisos",
					href: "/commercials/notifications",
					icon: "chat",
				},
				{ title: "Ajustes", href: "/commercials/settings", icon: "settings" },
			],
		},
	],
	client: [
		{
			title: "Inicio",
			items: [
				{ title: "Panel cliente", href: "/clients", icon: "home" },
				{ title: "Perfil", href: "/profile", icon: "profile" },
			],
		},
		{
			title: "Trabajo diario",
			items: [
				{ title: "Catálogo", href: "/clients/catalog", icon: "catalog" },
				{ title: "Coloración", href: "/clients/coloration", icon: "color" },
				{ title: "Pedidos", href: "/clients/orders", icon: "orders" },
				{
					title: "Fichas salón",
					href: "/clients/salon-clients",
					icon: "clients",
				},
			],
		},
		{
			title: "Ventajas y avisos",
			items: [
				{
					title: "Promociones",
					href: "/clients/promotions",
					icon: "promotions",
				},
				{ title: "Formaciones", href: "/clients/trainings", icon: "training" },
				{ title: "Avisos", href: "/clients/notifications", icon: "chat" },
			],
		},
	],
};
