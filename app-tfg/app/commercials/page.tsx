import NavCard from "../components/NavCard";
import PageTransition from "../components/animations/PageTransition";
import RouteMapCard from "../components/RouteMapCard";
import { requireCommercialSession } from "@/lib/auth/require-session";
import { listNotificationsForUser } from "@/lib/typeorm/services/communications/communications";
import Link from "next/link";

import {
	CatalogIcon,
	ColorIcon,
	OrderIcon,
	TrainingIcon,
	ClientsIcon,
	VisitsIcon,
	RouteIcon,
	ChatIcon,
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
	items: DashboardSectionItem[];
}> = [
	{
		title: "Gestión comercial",
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
		],
	},
	{
		title: "Catálogo y operativa comercial",
		items: [
			{
				title: "Catálogo",
				icon: <CatalogIcon className="h-6 w-6" />,
				href: "/commercials/catalog",
			},
			{
				title: "Coloración",
				icon: <ColorIcon className="h-6 w-6" />,
				href: "/commercials/coloration",
			},
			{
				title: "Pedidos",
				icon: <OrderIcon className="h-6 w-6" />,
				href: "/commercials/orders",
			},
			{
				title: "Preparar repartos",
				icon: <OrderIcon className="h-6 w-6" />,
				href: "/commercials/orders/preparation",
			},
		],
	},
	{
		title: "Comunicación y seguimiento",
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
			{unreadNotificationsCount > 0 ? (
				<section className="my-5 rounded-3xl border border-amber-200 bg-amber-50/95 px-4 py-4 text-amber-900 shadow-sm">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
								Notificaciones y avisos
							</p>
							<p className="mt-1 text-sm text-amber-900">
								Tienes {unreadNotificationsCount} aviso
								{unreadNotificationsCount === 1 ? "" : "s"} pendiente
								{unreadNotificationsCount === 1 ? "" : "s"} de lectura.
							</p>
						</div>

						<Link
							href="/commercials/notifications"
							className="inline-flex items-center justify-center rounded-2xl bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
						>
							Ver avisos
						</Link>
					</div>
				</section>
			) : null}

			<div className="mb-6">
				<RouteMapCard compact />
			</div>

			<div className="space-y-6">
				{sections.map((section) => (
					<section
						key={section.title}
						className="rounded-3xl border border-white/20 bg-white/10 p-4 backdrop-blur-md"
					>
						<div className="mb-4 px-1">
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
