import H1Title from "@/app/components/H1Title";
import CatalogAdminWorkspace from "@/app/components/catalog-admin/CatalogAdminWorkspace";
import { mapColorReferencesToEntityTableItems } from "@/app/components/catalog/catalog-table-mappers";
import { getSingleSearchParamValue } from "@/app/components/catalog-admin/catalog-navigation";
import {
	buildCategoryBadgeClassMap,
} from "@/app/components/catalog/category-badge-palette";
import { listColorReferences } from "@/lib/typeorm/services/catalog/color-chart";

type Props = {
	searchParams?: Promise<{
		category?: string | string[];
		colorChart?: string | string[];
	}>;
};

export default async function AdminColorReferencesPage({ searchParams }: Props) {
	const resolvedSearchParams =
		(await searchParams) ??
		({
			category: undefined,
			colorChart: undefined,
		} as const);
	const colorReferences = await listColorReferences();
	const lineBadgeClassMap = buildCategoryBadgeClassMap(
		colorReferences.map((colorReference) => colorReference.colorChart?.productLine?.name),
	);
	const colorChartBadgeClassMap = buildCategoryBadgeClassMap(
		colorReferences.map((colorReference) => colorReference.colorChart?.name),
	);

	return (
		<div className="space-y-6">
			<H1Title
				title="Referencias de color"
				subtitle="Gestiona tonos individuales y su orden dentro de cada carta"
			/>

			<CatalogAdminWorkspace
				entityLabel="referencia"
				basePath="/admin/catalog/color-references"
				items={mapColorReferencesToEntityTableItems(
					colorReferences,
					lineBadgeClassMap,
					colorChartBadgeClassMap,
					{ hrefBasePath: "/admin/catalog/color-references" },
				)}
				metrics={[
					{ label: "referencias", value: colorReferences.length },
					{
						label: "cartas activas",
						value: new Set(
							colorReferences.map((colorReference) => colorReference.color_chart_id),
						).size,
					},
					{
						label: "con imagen",
						value: colorReferences.filter((colorReference) =>
							Boolean(colorReference.image_url),
						).length,
					},
				]}
				tableConfig={{
					categoryLabel: "Linea",
					showImageFilter: true,
					cardVariant: "color-reference",
					defaultSortField: "primaryDate",
					defaultSortDirection: "asc",
					primaryDateLabel: "Codigo",
					initialCategoryFilter: getSingleSearchParamValue(
						resolvedSearchParams.category,
					),
					initialExtraFilterValues: {
						colorChart: getSingleSearchParamValue(
							resolvedSearchParams.colorChart,
						) ?? "",
					},
					extraFilters: [
						{
							key: "colorChart",
							label: "Carta de color",
							allLabel: "Todas",
							dependsOn: ["category"],
						},
					],
					gridClassName:
						"grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
					emptyMessage: "No hay referencias de color registradas todavia.",
				}}
			/>
		</div>
	);
}
