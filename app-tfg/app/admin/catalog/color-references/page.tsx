import H1Title from "@/app/components/H1Title";
import CatalogAdminWorkspace from "@/app/components/catalog-admin/CatalogAdminWorkspace";
import type { EntityTableItem } from "@/app/components/entity-table/entity-table-types";
import {
	getColorReferenceFields,
	getColorReferenceInitialValues,
} from "@/app/admin/catalog/_shared/catalog-form-config";
import {
	listColorCharts,
	listColorReferences,
} from "@/lib/typeorm/services/catalog/color-chart";

function mapColorReferenceToItem(
	colorReference: Awaited<ReturnType<typeof listColorReferences>>[number],
): EntityTableItem {
	return {
		id: colorReference.id,
		title: `${colorReference.code} · ${colorReference.name}`,
		subtitle: colorReference.description || "Sin descripcion",
		imageUrl: colorReference.image_url,
		category: colorReference.colorChart?.name ?? "Sin carta",
		status: `Orden ${colorReference.display_order}`,
		primaryDate: String(9999 - colorReference.display_order).padStart(4, "0"),
		badges: [
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
		searchText: [
			colorReference.code,
			colorReference.name,
			colorReference.description,
			colorReference.colorChart?.name,
		]
			.filter(Boolean)
			.join(" "),
	};
}

export default async function AdminColorReferencesPage() {
	const [colorReferences, colorCharts] = await Promise.all([
		listColorReferences(),
		listColorCharts(),
	]);

	return (
		<div className="space-y-6">
			<H1Title
				title="Referencias de color"
				subtitle="Gestiona tonos individuales y su orden dentro de cada carta"
			/>

			<CatalogAdminWorkspace
				entityLabel="referencia"
				entityLabelPlural="las referencias de color"
				basePath="/admin/catalog/color-references"
				apiBasePath="/api/admin/catalog/color-references"
				items={colorReferences.map(mapColorReferenceToItem)}
				initialValues={getColorReferenceInitialValues()}
				fields={getColorReferenceFields(colorCharts)}
				editPathPattern="/admin/catalog/color-references/[id]/edit"
				createRedirectToEdit
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
					categoryLabel: "Carta",
					statusLabel: "Orden",
					showImageFilter: true,
					emptyMessage: "No hay referencias de color registradas todavia.",
				}}
			/>
		</div>
	);
}
