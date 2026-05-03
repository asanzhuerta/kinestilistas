import NavCard from "@/app/components/NavCard";
import PageTransition from "@/app/components/animations/PageTransition";
import {
	CatalogIcon,
	ColorIcon,
	ProductsIcon,
	TrainingIcon,
} from "@/app/components/IconsSVGs";

const navItems = [
	{
		title: "Categorias y lineas",
		icon: <CatalogIcon className="h-6 w-6" />,
		href: "/admin/catalog/product-lines",
	},
	{
		title: "Productos",
		icon: <ProductsIcon className="h-6 w-6" />,
		href: "/admin/catalog/products",
	},
	{
		title: "Recursos de apoyo",
		icon: <TrainingIcon className="h-6 w-6" />,
		href: "/admin/catalog/support-resources",
	},
	{
		title: "Cartas de color",
		icon: <ColorIcon className="h-6 w-6" />,
		href: "/admin/catalog/color-charts",
	},
	{
		title: "Referencias de color",
		icon: <ColorIcon className="h-6 w-6" />,
		href: "/admin/catalog/color-references",
	},
];

export default function AdminCatalogHome() {
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
