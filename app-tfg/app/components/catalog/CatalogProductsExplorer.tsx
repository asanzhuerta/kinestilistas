import H1Title from "@/app/components/H1Title";
import EntityTable from "@/app/components/entity-table/EntityTable";
import { mapCatalogProductsToEntityTableItems } from "./catalog-table-mappers";
import type { listProducts } from "@/lib/typeorm/services/catalog/product";

type Props = {
	title: string;
	subtitle: string;
	products: Awaited<ReturnType<typeof listProducts>>;
	detailBasePath: string;
};

export default function CatalogProductsExplorer({
	title,
	subtitle,
	products,
	detailBasePath,
}: Props) {
	return (
		<div className="space-y-6">
			<H1Title title={title} subtitle={subtitle} />

			<EntityTable
				items={mapCatalogProductsToEntityTableItems(products, detailBasePath)}
				config={{
					categoryLabel: "Categoría",
					showImageFilter: true,
					defaultSortField: "title",
					defaultSortDirection: "asc",
					cardVariant: "catalog-product",
					gridClassName:
						"grid grid-cols-1 gap-4 p-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
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
					persistenceKey: `catalog-products:${detailBasePath}`,
					emptyMessage:
						"No hay productos activos que coincidan con los filtros actuales.",
				}}
			/>
		</div>
	);
}
