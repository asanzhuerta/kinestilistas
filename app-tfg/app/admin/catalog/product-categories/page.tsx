import H1Title from "@/app/components/H1Title";
import CatalogAdminWorkspace from "@/app/components/catalog-admin/CatalogAdminWorkspace";
import type { EntityTableItem } from "@/app/components/entity-table/entity-table-types";
import { listProductCategories } from "@/lib/typeorm/services/catalog/product-category";

function mapProductCategoryToItem(
	category: Awaited<ReturnType<typeof listProductCategories>>[number],
): EntityTableItem {
	return {
		id: category.id,
		title: category.name,
		subtitle: category.description || "Sin descripcion",
		category: null,
		status: null,
		primaryDate: String(9999 - category.display_order).padStart(4, "0"),
		badges: [
			{
				label: `Orden ${category.display_order}`,
				className: "bg-slate-100 text-slate-700 border border-slate-200",
			},
		],
		fields: [
			{
				label: "Descripcion",
				value: category.description || "-",
			},
			{
				label: "Orden",
				value: String(category.display_order),
			},
		],
		actions: [
			{
				label: "Editar",
				href: `/admin/catalog/product-categories/${category.id}/edit`,
				variant: "secondary",
			},
		],
		searchText: [category.name, category.description].filter(Boolean).join(" "),
	};
}

export default async function AdminProductCategoriesPage() {
	const categories = await listProductCategories();

	return (
		<div className="space-y-6">
			<H1Title
				title="Categorias"
				subtitle="Organiza las familias generales del catalogo profesional"
			/>

			<CatalogAdminWorkspace
				entityLabel="categoria"
				basePath="/admin/catalog/product-categories"
				items={categories.map(mapProductCategoryToItem)}
				metrics={[
					{ label: "categorias", value: categories.length },
					{
						label: "con descripcion",
						value: categories.filter((category) => Boolean(category.description))
							.length,
					},
				]}
				tableConfig={{
					emptyMessage: "No hay categorias registradas todavia.",
				}}
			/>
		</div>
	);
}
