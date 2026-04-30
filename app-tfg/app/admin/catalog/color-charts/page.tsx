import H1Title from "@/app/components/H1Title";
import CatalogAdminWorkspace from "@/app/components/catalog-admin/CatalogAdminWorkspace";
import type { EntityTableItem } from "@/app/components/entity-table/entity-table-types";
import { listColorCharts } from "@/lib/typeorm/services/catalog/color-chart";
import { formatDateShort } from "@/lib/utils/user-utils";

function mapColorChartToItem(
	colorChart: Awaited<ReturnType<typeof listColorCharts>>[number],
): EntityTableItem {
	return {
		id: colorChart.id,
		title: colorChart.name,
		subtitle: colorChart.description || "Sin descripcion",
		imageUrl: colorChart.image_url,
		category: colorChart.productLine?.name ?? "Sin linea",
		status: colorChart.image_url ? "Con imagen" : "Sin imagen",
		primaryDate: colorChart.created_at.toISOString(),
		badges: [
			{
				label: colorChart.productLine?.name ?? "Sin linea",
				className: "bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200",
			},
		],
		fields: [
			{
				label: "Descripcion",
				value: colorChart.description || "-",
			},
			{
				label: "Linea",
				value: colorChart.productLine?.name || "-",
			},
			{
				label: "Alta",
				value: formatDateShort(colorChart.created_at),
			},
		],
		actions: [
			{
				label: "Editar",
				href: `/admin/catalog/color-charts/${colorChart.id}/edit`,
				variant: "secondary",
			},
		],
		searchText: [
			colorChart.name,
			colorChart.description,
			colorChart.productLine?.name,
		]
			.filter(Boolean)
			.join(" "),
	};
}

export default async function AdminColorChartsPage() {
	const colorCharts = await listColorCharts();

	return (
		<div className="space-y-6">
			<H1Title
				title="Cartas de color"
				subtitle="Organiza cartas cromaticas vinculadas a las lineas de coloracion"
			/>

			<CatalogAdminWorkspace
				entityLabel="carta de color"
				basePath="/admin/catalog/color-charts"
				items={colorCharts.map(mapColorChartToItem)}
				metrics={[
					{ label: "cartas", value: colorCharts.length },
					{
						label: "con imagen",
						value: colorCharts.filter((colorChart) => Boolean(colorChart.image_url))
							.length,
					},
				]}
				tableConfig={{
					categoryLabel: "Linea",
					statusLabel: "Imagen",
					showImageFilter: true,
					emptyMessage: "No hay cartas de color registradas todavia.",
				}}
			/>
		</div>
	);
}
