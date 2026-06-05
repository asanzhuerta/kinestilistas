import AssistantCard from "../components/AssistantCard";
import NavCard from "../components/NavCard";
import PageTransition from "../components/animations/PageTransition";
import ClientDeliveryEstimateCard from "../components/clients/ClientDeliveryEstimateCard";
import { requireClientSession } from "@/lib/auth/require-session";
import { listNotificationsForUser } from "@/lib/typeorm/services/communications/communications";
import {
	AgendaIcon,
	AppointmentIcon,
	CatalogIcon,
	ChatIcon,
	ClientsIcon,
	ColorIcon,
	OrderIcon,
	PricesIcon,
	ProductsIcon,
	PromotionsIcon,
	SimulatorIcon,
	TrainingIcon,
} from "../components/IconsSVGs";

const navItems = [
	{
		title: "Coloracion",
		icon: <ColorIcon className="h-6 w-6" />,
		href: "/clients/coloration",
	},
	{
		title: "Catalogos",
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
	{ title: "Productos", icon: <ProductsIcon className="h-6 w-6" />, disabled: true },
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
			<div className="mb-6">
				<ClientDeliveryEstimateCard />
			</div>

			<div className="mb-6">
				<AssistantCard />
			</div>

			<div className="mb-4 rounded-2xl border border-slate-200 bg-white/75 px-4 py-3 text-sm text-slate-600 shadow-sm">
				En esta version ya tienes operativos la prevision de reparto, el
				catalogo de productos, la consulta de coloracion, la gestion de
				pedidos, las fichas tecnicas del salon con plantillas y borradores
				tecnicos, promociones, formaciones, avisos internos y la gestion de tu
				perfil. El resto de accesos se activaran en las siguientes iteraciones.
			</div>

			{unreadNotificationsCount > 0 ? (
				<div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-sm">
					Tienes {unreadNotificationsCount} aviso
					{unreadNotificationsCount === 1 ? "" : "s"} pendiente
					{unreadNotificationsCount === 1 ? "" : "s"} de lectura.
				</div>
			) : null}

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
