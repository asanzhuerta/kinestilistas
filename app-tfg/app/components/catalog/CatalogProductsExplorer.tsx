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
	const categoriesCount = new Set(
		products.map((product) => product.productCategory?.name).filter(Boolean),
	).size;
	const linesCount = new Set(
		products.map((product) => product.productLine?.name).filter(Boolean),
	).size;
	const subcategoriesCount = new Set(
		products
			.map((product) => product.productSubcategory?.name)
			.filter(Boolean),
	).size;
	const productsWithTechnicalInfo = products.filter((product) =>
		Boolean(product.technical_info),
	).length;

	return (
		<div className="space-y-6">
			<H1Title title={title} subtitle={subtitle} />

			<section className="glass-card rounded-3xl border border-white/30 bg-white/70 p-6 shadow-xl backdrop-blur">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
							M3 / Consulta de catálogo
						</p>

						<h2 className="text-3xl font-bold text-slate-900">
							Explora el porfolio disponible
						</h2>

						<p className="mt-2 max-w-3xl text-sm text-slate-600">
							Filtra por familia, línea comercial o subcategoría para localizar
							productos, revisar sus formatos y abrir la ficha completa con
							información técnica y recursos de apoyo.
						</p>
					</div>

					<div className="flex flex-wrap gap-3 text-sm text-slate-600">
						<div className="rounded-full border border-slate-200 bg-white px-4 py-2">
							<span className="font-semibold text-slate-900">
								{products.length}
							</span>{" "}
							productos
						</div>
						<div className="rounded-full border border-slate-200 bg-white px-4 py-2">
							<span className="font-semibold text-slate-900">
								{categoriesCount}
							</span>{" "}
							categorías
						</div>
						<div className="rounded-full border border-slate-200 bg-white px-4 py-2">
							<span className="font-semibold text-slate-900">
								{linesCount}
							</span>{" "}
							líneas
						</div>
						<div className="rounded-full border border-slate-200 bg-white px-4 py-2">
							<span className="font-semibold text-slate-900">
								{subcategoriesCount}
							</span>{" "}
							subcategorías
						</div>
						<div className="rounded-full border border-slate-200 bg-white px-4 py-2">
							<span className="font-semibold text-slate-900">
								{productsWithTechnicalInfo}
							</span>{" "}
							con ficha técnica
						</div>
					</div>
				</div>
			</section>

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
						},
						{
							key: "subcategory",
							label: "Subcategoría",
							allLabel: "Todas",
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
