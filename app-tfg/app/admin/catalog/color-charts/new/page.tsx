import CatalogAdminCreateShell from "@/app/admin/catalog/_shared/CatalogAdminCreateShell";
import {
	getColorChartFields,
	getColorChartInitialValues,
} from "@/app/admin/catalog/_shared/catalog-form-config";
import CatalogAdminForm from "@/app/components/catalog-admin/CatalogAdminForm";
import { listProductLines } from "@/lib/typeorm/services/catalog/product-line";

export default async function NewColorChartPage() {
	const productLines = await listProductLines();

	return (
		<CatalogAdminCreateShell
			title="Nueva carta de color"
			subtitle="Crea una carta cromatica vinculada a una linea comercial concreta."
			backHref="/admin/catalog/color-charts"
			backLabel="cartas de color"
		>
			<CatalogAdminForm
				entityLabel="carta de color"
				entityLabelPlural="las cartas de color"
				basePath="/admin/catalog/color-charts"
				apiBasePath="/api/admin/catalog/color-charts"
				initialValues={getColorChartInitialValues()}
				fields={getColorChartFields(productLines)}
				cancelHref="/admin/catalog/color-charts"
				showHeader={false}
				editPathPattern="/admin/catalog/color-charts/[id]/edit"
				createRedirectToEdit
			/>
		</CatalogAdminCreateShell>
	);
}
