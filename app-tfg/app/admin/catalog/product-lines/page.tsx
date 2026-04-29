import H1Title from "@/app/components/H1Title";
import CatalogAdminWorkspace from "@/app/components/catalog-admin/CatalogAdminWorkspace";
import type { EntityTableItem } from "@/app/components/entity-table/entity-table-types";
import {
	getProductLineFields,
	getProductLineInitialValues,
} from "@/app/admin/catalog/_shared/catalog-form-config";
import { listProductCategories } from "@/lib/typeorm/services/catalog/product-category";
import { listProductLines } from "@/lib/typeorm/services/catalog/product-line";

function mapProductLineToItem(
	productLine: Awaited<ReturnType<typeof listProductLines>>[number],
): EntityTableItem {
	return {
		id: productLine.id,
		title: productLine.name,
		subtitle: productLine.description || "Sin descripcion",
		imageUrl: productLine.image_url,
		category: productLine.productCategory?.name ?? "Sin categoria",
		status: productLine.image_url ? "Con imagen" : "Sin imagen",
		primaryDate: String(9999 - productLine.display_order).padStart(4, "0"),
		badges: [
			{
				label: productLine.productCategory?.name ?? "Sin categoria",
				className: "bg-sky-100 text-sky-700 border border-sky-200",
			},
			{
				label: `Orden ${productLine.display_order}`,
				className: "bg-slate-100 text-slate-700 border border-slate-200",
			},
		],
		fields: [
			{ label: "Descripcion", value: productLine.description || "-" },
			{ label: "Categoria", value: productLine.productCategory?.name || "-" },
			{ label: "Orden", value: String(productLine.display_order) },
			{ label: "Imagen", value: productLine.image_url ? "Disponible" : "-" },
		],
		actions: [
			{
				label: "Editar",
				href: `/admin/catalog/product-lines/${productLine.id}/edit`,
				variant: "secondary",
			},
		],
		searchText: [
			productLine.name,
			productLine.description,
			productLine.productCategory?.name,
		]
			.filter(Boolean)
			.join(" "),
	};
}

export default async function AdminProductLinesPage() {
	const [productLines, productCategories] = await Promise.all([
		listProductLines(),
		listProductCategories(),
	]);

	return (
		<div className="space-y-6">
			<H1Title
				title="Lineas comerciales"
				subtitle="Gestiona las agrupaciones especificas de la oferta del distribuidor"
			/>

			<CatalogAdminWorkspace
				entityLabel="linea comercial"
				entityLabelPlural="las lineas comerciales"
				basePath="/admin/catalog/product-lines"
				apiBasePath="/api/admin/catalog/product-lines"
				items={productLines.map(mapProductLineToItem)}
				initialValues={getProductLineInitialValues()}
				fields={getProductLineFields(productCategories)}
				editPathPattern="/admin/catalog/product-lines/[id]/edit"
				createRedirectToEdit
				metrics={[
					{ label: "lineas", value: productLines.length },
					{
						label: "con imagen",
						value: productLines.filter((productLine) => Boolean(productLine.image_url))
							.length,
					},
					{
						label: "categorias usadas",
						value: new Set(
							productLines.map((productLine) => productLine.product_category_id),
						).size,
					},
				]}
				tableConfig={{
					categoryLabel: "Categoria",
					statusLabel: "Imagen",
					showImageFilter: true,
					emptyMessage: "No hay lineas comerciales registradas todavia.",
				}}
			/>
		</div>
	);
}
