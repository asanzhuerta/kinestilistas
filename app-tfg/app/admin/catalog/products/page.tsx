import H1Title from "@/app/components/H1Title";
import CatalogAdminWorkspace from "@/app/components/catalog-admin/CatalogAdminWorkspace";
import { getSingleSearchParamValue } from "@/app/components/catalog-admin/catalog-navigation";
import type { EntityTableItem } from "@/app/components/entity-table/entity-table-types";
import { listProducts } from "@/lib/typeorm/services/catalog/product";
import { formatDateShort } from "@/lib/utils/user-utils";

function getProductStatusClass(statusCode: string | undefined) {
	if (statusCode === "active") {
		return "bg-emerald-100 text-emerald-700 border border-emerald-200";
	}

	if (statusCode === "inactive") {
		return "bg-amber-100 text-amber-700 border border-amber-200";
	}

	return "bg-slate-100 text-slate-700 border border-slate-200";
}

function mapProductToItem(
	product: Awaited<ReturnType<typeof listProducts>>[number],
): EntityTableItem {
	return {
		id: product.id,
		title: product.name,
		subtitle: product.reference,
		imageUrl: product.image_url,
		category: product.productCategory?.name ?? "Sin categoria",
		status: product.status?.name ?? "Sin estado",
		primaryDate: product.created_at.toISOString(),
		badges: [
			{
				label: product.status?.name ?? "Sin estado",
				className: getProductStatusClass(product.status?.code),
			},
			{
				label: product.productLine?.name ?? "Sin linea",
				className: "bg-sky-100 text-sky-700 border border-sky-200",
			},
		],
		fields: [
			{ label: "Categoria", value: product.productCategory?.name || "-" },
			{ label: "Linea", value: product.productLine?.name || "-" },
			{
				label: "Subcategoria",
				value: product.productSubcategory?.name || "-",
			},
			{ label: "Formato", value: product.format || "-" },
			{
				label: "Packing",
				value:
					product.packing !== null && product.packing !== undefined
						? String(product.packing)
						: "-",
			},
			{ label: "Proveedor", value: product.supplier || "-" },
			{ label: "Precio base", value: `${product.base_price} EUR` },
			{ label: "Alta", value: formatDateShort(product.created_at) },
		],
		actions: [
			{
				label: "Editar",
				href: `/admin/catalog/products/${product.id}/edit`,
				variant: "secondary",
			},
		],
		filterValues: {
			productLine: product.productLine?.name ?? null,
			subcategory: product.productSubcategory?.name ?? null,
		},
		searchText: [
			product.name,
			product.reference,
			product.description,
			product.productSubcategory?.name,
			product.format,
			product.packing !== null && product.packing !== undefined
				? String(product.packing)
				: null,
			product.supplier,
			product.productCategory?.name,
			product.productLine?.name,
			product.productSubcategory?.name,
			product.status?.name,
		]
			.filter(Boolean)
			.join(" "),
	};
}

type Props = {
	searchParams?: Promise<{
		category?: string | string[];
		productLine?: string | string[];
		subcategory?: string | string[];
	}>;
};

export default async function AdminProductsPage({ searchParams }: Props) {
	const resolvedSearchParams =
		(await searchParams) ??
		({
			category: undefined,
			productLine: undefined,
			subcategory: undefined,
		} as const);
	const products = await listProducts();

	return (
		<div className="space-y-6">
			<H1Title
				title="Productos"
				subtitle="Administra articulos, referencias, precios base y documentacion tecnica"
			/>

			<CatalogAdminWorkspace
				entityLabel="producto"
				basePath="/admin/catalog/products"
				items={products.map(mapProductToItem)}
				metrics={[
					{ label: "productos", value: products.length },
					{
						label: "activos",
						value: products.filter((product) => product.status?.code === "active")
							.length,
					},
					{
						label: "con imagen",
						value: products.filter((product) => Boolean(product.image_url)).length,
					},
				]}
				tableConfig={{
					categoryLabel: "Categoria",
					statusLabel: "Estado",
					showImageFilter: true,
					initialCategoryFilter: getSingleSearchParamValue(
						resolvedSearchParams.category,
					),
					initialExtraFilterValues: {
						productLine: getSingleSearchParamValue(
							resolvedSearchParams.productLine,
						) ?? "",
						subcategory: getSingleSearchParamValue(
							resolvedSearchParams.subcategory,
						) ?? "",
					},
					extraFilters: [
						{
							key: "productLine",
							label: "Linea comercial",
							allLabel: "Todas",
							dependsOn: ["category"],
						},
						{
							key: "subcategory",
							label: "Subcategoria",
							allLabel: "Todas",
							dependsOn: ["category", "productLine"],
						},
					],
					emptyMessage: "No hay productos registrados todavia.",
				}}
			/>
		</div>
	);
}
