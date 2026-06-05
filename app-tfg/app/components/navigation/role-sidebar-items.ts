export type RoleSidebarRole = "admin" | "commercial" | "client";

export type RoleSidebarIcon =
	| "activity"
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
		subtitle: "Salon profesional",
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
					icon: "clients",
				},
				{
					title: "Gestión de clientes",
					href: "/admin/clients",
					icon: "clients",
				},
			],
		},
		{
			title: "Catalogo",
			items: [
				{ title: "Catalogo", href: "/admin/catalog", icon: "catalog" },
				{
					title: "Categorias",
					href: "/admin/catalog/product-categories",
					icon: "catalog",
				},
				{
					title: "Lineas",
					href: "/admin/catalog/product-lines",
					icon: "catalog",
				},
				{
					title: "Subcategorias",
					href: "/admin/catalog/product-subcategories",
					icon: "catalog",
				},
				{
					title: "Productos",
					href: "/admin/catalog/products",
					icon: "orders",
				},
				{
					title: "Cartas color",
					href: "/admin/catalog/color-charts",
					icon: "color",
				},
				{
					title: "Referencias color",
					href: "/admin/catalog/color-references",
					icon: "color",
				},
				{
					title: "Recursos soporte",
					href: "/admin/catalog/support-resources",
					icon: "training",
				},
			],
		},
		{
			title: "Operacion",
			items: [
				{ title: "Pedidos", href: "/admin/orders", icon: "orders" },
				{
					title: "Comunicaciones",
					href: "/admin/communications",
					icon: "chat",
				},
				{ title: "Auditoria", href: "/admin/audit", icon: "reports" },
				{ title: "Operacion M7", href: "/admin/operations", icon: "reports" },
				{
					title: "Operaciones empresa",
					href: "/admin/enterprise-operations",
					icon: "reports",
				},
				{
					title: "Integraciones",
					href: "/admin/integrations",
					icon: "settings",
				},
				{ title: "Soporte", href: "/admin/support", icon: "settings" },
				{ title: "Ajustes", href: "/admin/settings", icon: "settings" },
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
			title: "Gestion comercial",
			items: [
				{ title: "Clientes", href: "/commercials/clients", icon: "clients" },
				{ title: "Rutas", href: "/commercials/routes", icon: "route" },
				{ title: "Visitas", href: "/commercials/visits", icon: "visits" },
				{
					title: "Actividad",
					href: "/commercials/activity",
					icon: "activity",
				},
			],
		},
		{
			title: "Ventas",
			items: [
				{ title: "Catalogo", href: "/commercials/catalog", icon: "catalog" },
				{
					title: "Coloracion",
					href: "/commercials/coloration",
					icon: "color",
				},
				{ title: "Pedidos", href: "/commercials/orders", icon: "orders" },
				{ title: "Cobros", href: "/commercials/cobros", icon: "payments" },
			],
		},
		{
			title: "Comunicacion",
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
				{ title: "Catalogo", href: "/clients/catalog", icon: "catalog" },
				{ title: "Coloracion", href: "/clients/coloration", icon: "color" },
				{ title: "Pedidos", href: "/clients/orders", icon: "orders" },
				{
					title: "Fichas salon",
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
