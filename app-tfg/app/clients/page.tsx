import NavCard from "../components/NavCard";
import PageTransition from "../components/animations/PageTransition";
import ClientDeliveryEstimateCard from "../components/clients/ClientDeliveryEstimateCard";
import { requireClientSession } from "@/lib/auth/require-session";
import { listNotificationsForUser } from "@/lib/typeorm/services/communications/communications";
import Link from "next/link";
import {
	AgendaIcon,
	AppointmentIcon,
	CatalogIcon,
	ChatIcon,
	ClientsIcon,
	ColorIcon,
	OrderIcon,
	PricesIcon,
	PromotionsIcon,
	SimulatorIcon,
	TrainingIcon,
} from "../components/IconsSVGs";

const navItems = [
	{
		title: "Coloración",
		icon: <ColorIcon className="h-6 w-6" />,
		href: "/clients/coloration",
	},
	{
		title: "Catálogos",
		icon: <CatalogIcon className="h-6 w-6" />,
		href: "/clients/catalog",
	},
	{
		title: "Fichas",
		icon: <ClientsIcon className="h-6 w-6" />,
		href: "/clients/salon-clients",
	},
	{ title: "Agenda", icon: <AgendaIcon className="h-6 w-6" />, disabled: true },
	{ title: "Citas", icon: <AppointmentIcon className="h-6 w-6" />, disabled: true },
	{
		title: "Pedidos",
		icon: <OrderIcon className="h-6 w-6" />,
		href: "/clients/orders",
	},
	{ title: "Tarifas", icon: <PricesIcon className="h-6 w-6" />, disabled: true },
	{ title: "Simulador", icon: <SimulatorIcon className="h-6 w-6" />, disabled: true },
	{
		title: "Promociones",
		icon: <PromotionsIcon className="h-6 w-6" />,
		href: "/clients/promotions",
	},
	{
		title: "Formaciones",
		icon: <TrainingIcon className="h-6 w-6" />,
		href: "/clients/trainings",
	},
	{
		title: "Avisos",
		icon: <ChatIcon className="h-6 w-6" />,
		href: "/clients/notifications",
	},
];

export default async function ClientsHome() {
	const session = await requireClientSession();
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
							href="/clients/notifications"
							className="inline-flex items-center justify-center rounded-2xl bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-800"
						>
							Ver avisos
						</Link>
					</div>
				</section>
			) : null}

			<div className="mb-6">
				<ClientDeliveryEstimateCard />
			</div>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
				{navItems.map((item) => (
					<NavCard
						key={item.title}
						title={item.title}
						icon={item.icon}
						href={item.href}
						disabled={item.disabled}
						badgeCount={
							item.href === "/clients/notifications"
								? unreadNotificationsCount
								: 0
						}
						badgeLabel="avisos sin leer"
					/>
				))}
			</div>
		</PageTransition>
	);
}
