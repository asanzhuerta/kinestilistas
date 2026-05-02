import AssistantCard from "../components/AssistantCard";
import NavCard from "../components/NavCard";
import HeaderTitle from "../components/basics/HeaderTitle";
import PageTransition from "../components/animations/PageTransition";
import ClientDeliveryEstimateCard from "../components/clients/ClientDeliveryEstimateCard";
import {
	AgendaIcon,
	AppointmentIcon,
	CatalogIcon,
	ColorIcon,
	OrderIcon,
	PricesIcon,
	ProductsIcon,
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
	{ title: "Agenda", icon: <AgendaIcon className="h-6 w-6" />, disabled: true },
	{ title: "Citas", icon: <AppointmentIcon className="h-6 w-6" />, disabled: true },
	{ title: "Pedido abierto", icon: <OrderIcon className="h-6 w-6" />, disabled: true },
	{ title: "Tarifas", icon: <PricesIcon className="h-6 w-6" />, disabled: true },
	{ title: "Productos", icon: <ProductsIcon className="h-6 w-6" />, disabled: true },
	{ title: "Simulador", icon: <SimulatorIcon className="h-6 w-6" />, disabled: true },
	{ title: "Formaciones", icon: <TrainingIcon className="h-6 w-6" />, disabled: true },
];

export default function ClientsHome() {
	return (
		<PageTransition>
			<HeaderTitle title="Kinestilistas" />

			<div className="mb-6">
				<AssistantCard />
			</div>

			<div className="mb-6">
				<ClientDeliveryEstimateCard />
			</div>

			<div className="mb-4 rounded-2xl border border-slate-200 bg-white/75 px-4 py-3 text-sm text-slate-600 shadow-sm">
				En esta version ya tienes operativos la prevision de reparto, el
				catalogo de productos, la consulta de coloracion y la gestion de tu
				perfil. El resto de accesos se activaran en las siguientes
				iteraciones.
			</div>

			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
				{navItems.map((item) => (
					<NavCard
						key={item.title}
						title={item.title}
						icon={item.icon}
						href={item.href}
						disabled={item.disabled}
					/>
				))}
			</div>
		</PageTransition>
	);
}
