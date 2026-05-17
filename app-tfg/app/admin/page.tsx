import NavCard from "../components/NavCard";
import PageTransition from "../components/animations/PageTransition";
import {
	CatalogIcon,
	ClientsIcon,
	OrderIcon,
	ReportsIcon,
} from "../components/IconsSVGs";

const navItems = [
	{
		title: "Gestion de usuarios",
		icon: <ClientsIcon className="h-6 w-6" />,
		href: "/admin/users",
	},
	{
		title: "Clientes",
		icon: <ClientsIcon className="h-6 w-6" />,
		href: "/admin/clients",
	},
	{
		title: "Catalogo",
		icon: <CatalogIcon className="h-6 w-6" />,
		href: "/admin/catalog",
	},
	{
		title: "Pedidos",
		icon: <OrderIcon className="h-6 w-6" />,
		href: "/admin/orders",
	},
	{
		title: "Auditoria",
		icon: <ReportsIcon className="h-6 w-6" />,
		href: "/admin/audit",
	},
];

export default function AdminHome() {
	return (
		<PageTransition>
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
				{navItems.map((item) => (
					<NavCard
						key={item.title}
						title={item.title}
						icon={item.icon}
						href={item.href}
					/>
				))}
			</div>
		</PageTransition>
	);
}
