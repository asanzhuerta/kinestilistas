import NavCard from "../components/NavCard";
import PageTransition from "../components/animations/PageTransition";
import RouteMapCard from "../components/RouteMapCard";
import { requireCommercialSession } from "@/lib/auth/require-session";
import { listNotificationsForUser } from "@/lib/typeorm/services/communications/communications";

import {
	CatalogIcon,
	ColorIcon,
	OrderIcon,
	ProductsIcon,
	TrainingIcon,
	ClientsIcon,
	VisitsIcon,
	RouteIcon,
	ActivityIcon,
	ChatIcon,
	PaymentsIcon,
	PromotionsIcon,
	ReportsIcon,
} from "../components/IconsSVGs";

type DashboardSectionItem = {
	title: string;
	icon: React.ReactNode;
	href?: string;
	disabled?: boolean;
};

const sections: Array<{
	title: string;
	module: string;
	items: DashboardSectionItem[];
}> = [
	{
		title: "Gestion comercial",
		module: "M2",
		items: [
			{
				title: "Clientes",
				icon: <ClientsIcon className="h-6 w-6" />,
				href: "/commercials/clients",
			},
			{
				title: "Visitas",
				icon: <VisitsIcon className="h-6 w-6" />,
				href: "/commercials/visits",
			},
			{
				title: "Rutas",
				icon: <RouteIcon className="h-6 w-6" />,
				href: "/commercials/routes",
			},
			{
				title: "Actividad",
				icon: <ActivityIcon className="h-6 w-6" />,
				href: "/commercials/activity",
			},
		],
	},
	{
		title: "Catalogo y operativa comercial",
		module: "M3 / M4",
		items: [
			{
				title: "Catalogo",
				icon: <CatalogIcon className="h-6 w-6" />,
				href: "/commercials/catalog",
			},
			{
				title: "Coloracion",
				icon: <ColorIcon className="h-6 w-6" />,
				href: "/commercials/coloration",
			},
			{
				title: "Productos",
				icon: <ProductsIcon className="h-6 w-6" />,
				disabled: true,
			},
			{
				title: "Pedidos",
				icon: <OrderIcon className="h-6 w-6" />,
				href: "/commercials/orders",
			},
			{
				title: "Cobros",
				icon: <PaymentsIcon className="h-6 w-6" />,
				href: "/commercials/cobros",
			},
		],
	},
	{
		title: "Comunicacion y seguimiento",
		module: "M6 / M7",
		items: [
			{
				title: "Promociones",
				icon: <PromotionsIcon className="h-6 w-6" />,
				href: "/commercials/promotions",
			},
			{
				title: "Formaciones",
				icon: <TrainingIcon className="h-6 w-6" />,
				href: "/commercials/trainings",
			},
			{
				title: "Avisos",
				icon: <ChatIcon className="h-6 w-6" />,
				href: "/commercials/notifications",
			},
			{
				title: "Informes",
				icon: <ReportsIcon className="h-6 w-6" />,
				disabled: true,
			},
		],
	},
];

export default async function CommercialsHome() {
	const session = await requireCommercialSession();
	const notifications = await listNotificationsForUser(session.user.id);
	const unreadNotificationsCount = notifications.filter(
		(notification) => !notification.read_at,
	).length;

	return (
		<PageTransition>
			<RouteMapCard />

			<div className="space-y-6">
				{unreadNotificationsCount > 0 ? (
					<div className="rounded-3xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-800 shadow-sm">
						Tienes {unreadNotificationsCount} aviso
						{unreadNotificationsCount === 1 ? "" : "s"} pendiente
						{unreadNotificationsCount === 1 ? "" : "s"} de lectura.
					</div>
				) : null}

				{sections.map((section) => (
					<section
						key={section.title}
						className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-md"
					>
						<div className="mb-4 px-1">
							<p className="text-xs font-medium uppercase tracking-[0.25em] text-black/50">
								{section.module}
							</p>
							<h2 className="text-lg font-semibold text-black/80">
								{section.title}
							</h2>
						</div>

						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
							{section.items.map((item) => (
								<NavCard
									key={item.title}
									title={item.title}
									icon={item.icon}
									href={item.href}
									disabled={item.disabled}
									badgeCount={
										item.href === "/commercials/notifications"
											? unreadNotificationsCount
											: 0
									}
									badgeLabel="avisos sin leer"
								/>
							))}
						</div>
					</section>
				))}
			</div>
		</PageTransition>
	);
}
