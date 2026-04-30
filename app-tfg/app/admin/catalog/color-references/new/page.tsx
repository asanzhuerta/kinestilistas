import CatalogAdminCreateShell from "@/app/admin/catalog/_shared/CatalogAdminCreateShell";
import {
	getColorReferenceFields,
	getColorReferenceInitialValues,
} from "@/app/admin/catalog/_shared/catalog-form-config";
import CatalogAdminForm from "@/app/components/catalog-admin/CatalogAdminForm";
import { listColorCharts } from "@/lib/typeorm/services/catalog/color-chart";

export default async function NewColorReferencePage() {
	const colorCharts = await listColorCharts();

	return (
		<CatalogAdminCreateShell
			title="Nueva referencia de color"
			subtitle="Añade un tono individual y situalo en la carta correspondiente."
			backHref="/admin/catalog/color-references"
			backLabel="referencias de color"
		>
			<CatalogAdminForm
				entityLabel="referencia"
				entityLabelPlural="las referencias de color"
				basePath="/admin/catalog/color-references"
				apiBasePath="/api/admin/catalog/color-references"
				initialValues={getColorReferenceInitialValues()}
				fields={getColorReferenceFields(colorCharts)}
				cancelHref="/admin/catalog/color-references"
				showHeader={false}
				editPathPattern="/admin/catalog/color-references/[id]/edit"
				createRedirectToEdit
			/>
		</CatalogAdminCreateShell>
	);
}
