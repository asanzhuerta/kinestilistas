import H1Title from "@/app/components/H1Title";
import CatalogAdminWorkspace from "@/app/components/catalog-admin/CatalogAdminWorkspace";
import { getSingleSearchParamValue } from "@/app/components/catalog-admin/catalog-navigation";
import {
	buildCategoryBadgeClassMap,
	getCategoryBadgeClass,
} from "@/app/components/catalog/category-badge-palette";
import type { EntityTableItem } from "@/app/components/entity-table/entity-table-types";
import { listProducts } from "@/lib/typeorm/services/catalog/product";
import { toIsoString } from "@/lib/utils/date-serialization";

function mapProductToItem(
	product: Awaited<ReturnType<typeof listProducts>>[number],
	categoryBadgeClassMap: Map<string, string>,
	subcategoryBadgeClassMap: Map<string, string>,
): EntityTableItem {
	return {
		id: product.id,
		title: product.name,
		subtitle: product.description || "",
		imageUrl: product.image_url,
		secondaryImageUrl: product.productLine?.image_url ?? null,
		secondaryImageLabel: product.productLine?.name ?? null,
		secondaryBadge: product.productSubcategory?.name
			? {
					label: product.productSubcategory.name,
					className: getCategoryBadgeClass(
						product.productSubcategory.name,
						subcategoryBadgeClassMap,
					),
				}
			: null,
		category: product.productCategory?.name ?? "Sin categoría",
		status: product.status?.name ?? "Sin estado",
		primaryDate: toIsoString(product.created_at),
		badges: [
			{
				label: product.productCategory?.name ?? "Sin categoría",
				className: getCategoryBadgeClass(
					product.productCategory?.name,
					categoryBadgeClassMap,
				),
			},
		],
		fields: [
			{ label: "Formato", value: product.format || "-" },
			{
				label: "Packing",
				value:
					product.packing !== null && product.packing !== undefined
						? String(product.packing)
						: "-",
			},
			{ label: "Precio base", value: `${product.base_price} EUR` },
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
	const categoryBadgeClassMap = buildCategoryBadgeClassMap(
		products.map((product) => product.productCategory?.name),
	);
	const subcategoryBadgeClassMap = buildCategoryBadgeClassMap(
		products.map((product) => product.productSubcategory?.name),
	);

	return (
		<div className="space-y-6">
			<H1Title
				title="Productos"
				subtitle="Administra articulos, referencias, precios base y documentación técnica"
			/>

			<CatalogAdminWorkspace
				entityLabel="producto"
				basePath="/admin/catalog/products"
				items={products.map((product) =>
					mapProductToItem(
						product,
						categoryBadgeClassMap,
						subcategoryBadgeClassMap,
					),
				)}
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
					categoryLabel: "Categoría",
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
					persistenceKey: "admin-catalog-products",
					extraFilters: [
						{
							key: "productLine",
							label: "Línea comercial",
							allLabel: "Todas",
							dependsOn: ["category"],
						},
						{
							key: "subcategory",
							label: "Subcategoría",
							allLabel: "Todas",
							dependsOn: ["category", "productLine"],
						},
					],
					emptyMessage: "No hay productos registrados todavía.",
					cardVariant: "catalog-product",
					gridClassName:
						"grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
				}}
			/>
		</div>
	);
}
