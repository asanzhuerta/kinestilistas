import H1Title from "@/app/components/H1Title";
import CatalogAdminWorkspace from "@/app/components/catalog-admin/CatalogAdminWorkspace";
import { getSingleSearchParamValue } from "@/app/components/catalog-admin/catalog-navigation";
import type { EntityTableItem } from "@/app/components/entity-table/entity-table-types";
import { listColorReferences } from "@/lib/typeorm/services/catalog/color-chart";

function mapColorReferenceToItem(
	colorReference: Awaited<ReturnType<typeof listColorReferences>>[number],
): EntityTableItem {
	return {
		id: colorReference.id,
		title: `${colorReference.code} - ${colorReference.name}`,
		subtitle: colorReference.description || "Sin descripcion",
		imageUrl: colorReference.image_url,
		category: colorReference.colorChart?.productLine?.name ?? "Sin linea",
		status: `Orden ${colorReference.display_order}`,
		primaryDate: String(9999 - colorReference.display_order).padStart(4, "0"),
		badges: [
			{
				label: colorReference.colorChart?.productLine?.name ?? "Sin linea",
				className: "bg-sky-100 text-sky-700 border border-sky-200",
			},
			{
				label: colorReference.colorChart?.name ?? "Sin carta",
				className: "bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200",
			},
		],
		fields: [
			{
				label: "Codigo",
				value: colorReference.code,
			},
			{
				label: "Nombre",
				value: colorReference.name,
			},
			{
				label: "Linea",
				value: colorReference.colorChart?.productLine?.name || "-",
			},
			{
				label: "Carta",
				value: colorReference.colorChart?.name || "-",
			},
			{
				label: "Orden",
				value: String(colorReference.display_order),
			},
		],
		actions: [
			{
				label: "Editar",
				href: `/admin/catalog/color-references/${colorReference.id}/edit`,
				variant: "secondary",
			},
		],
		filterValues: {
			colorChart: colorReference.colorChart?.name ?? null,
		},
		searchText: [
			colorReference.code,
			colorReference.name,
			colorReference.description,
			colorReference.colorChart?.name,
			colorReference.colorChart?.productLine?.name,
		]
			.filter(Boolean)
			.join(" "),
	};
}

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

	return (
		<div className="space-y-6">
			<H1Title
				title="Referencias de color"
				subtitle="Gestiona tonos individuales y su orden dentro de cada carta"
			/>

			<CatalogAdminWorkspace
				entityLabel="referencia"
				basePath="/admin/catalog/color-references"
				items={colorReferences.map(mapColorReferenceToItem)}
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
					statusLabel: "Orden",
					showImageFilter: true,
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
					emptyMessage: "No hay referencias de color registradas todavia.",
				}}
			/>
		</div>
	);
}
