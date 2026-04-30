import H1Title from "@/app/components/H1Title";
import CatalogAdminWorkspace from "@/app/components/catalog-admin/CatalogAdminWorkspace";
import type { EntityTableItem } from "@/app/components/entity-table/entity-table-types";
import {
	getProductFields,
	getProductInitialValues,
} from "@/app/admin/catalog/_shared/catalog-form-config";
import { listProductCategories } from "@/lib/typeorm/services/catalog/product-category";
import { listProductLines } from "@/lib/typeorm/services/catalog/product-line";
import { listProductStatuses } from "@/lib/typeorm/services/catalog/lookups";
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
			{ label: "Subcategoria", value: product.subcategory || "-" },
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
			subcategory: product.subcategory ?? null,
		},
		searchText: [
			product.name,
			product.reference,
			product.description,
			product.subcategory,
			product.supplier,
			product.productCategory?.name,
			product.productLine?.name,
			product.status?.name,
		]
			.filter(Boolean)
			.join(" "),
	};
}

export default async function AdminProductsPage() {
	const [products, productCategories, productLines, productStatuses] =
		await Promise.all([
			listProducts(),
			listProductCategories(),
			listProductLines(),
			listProductStatuses(),
		]);

	return (
		<div className="space-y-6">
			<H1Title
				title="Productos"
				subtitle="Administra articulos, referencias, precios base y documentacion tecnica"
			/>

			<CatalogAdminWorkspace
				entityLabel="producto"
				entityLabelPlural="los productos del catalogo"
				basePath="/admin/catalog/products"
				apiBasePath="/api/admin/catalog/products"
				items={products.map(mapProductToItem)}
				initialValues={getProductInitialValues()}
				fields={getProductFields({
					productCategories,
					productLines,
					productStatuses,
				})}
				editPathPattern="/admin/catalog/products/[id]/edit"
				createRedirectToEdit
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
					extraFilters: [
						{
							key: "productLine",
							label: "Linea comercial",
							allLabel: "Todas",
						},
						{
							key: "subcategory",
							label: "Subcategoria",
							allLabel: "Todas",
						},
					],
					emptyMessage: "No hay productos registrados todavia.",
				}}
			/>
		</div>
	);
}
