import CatalogAdminCreateShell from "@/app/admin/catalog/_shared/CatalogAdminCreateShell";
import {
	getColorReferenceFields,
	getColorReferenceInitialValues,
} from "@/app/admin/catalog/_shared/catalog-form-config";
import { getSingleSearchParamValue } from "@/app/components/catalog-admin/catalog-navigation";
import CatalogAdminForm from "@/app/components/catalog-admin/CatalogAdminForm";
import { listColorCharts } from "@/lib/typeorm/services/catalog/color-chart";

type Props = {
	searchParams?: Promise<{
		colorChartId?: string | string[];
	}>;
};

export default async function NewColorReferencePage({ searchParams }: Props) {
	const [colorCharts, resolvedSearchParams] = await Promise.all([
		listColorCharts(),
		searchParams,
	]);
	const initialValues = getColorReferenceInitialValues();
	const initialColorChartId = getSingleSearchParamValue(
		resolvedSearchParams?.colorChartId,
	);

	return (
		<CatalogAdminCreateShell
			title="Nueva referencia de color"
			subtitle="Añade un tono individual y situalo en la carta correspondiente."
			backHref="/admin/catalog/color-references"
		>
			<CatalogAdminForm
				entityLabel="referencia"
				entityLabelPlural="las referencias de color"
				basePath="/admin/catalog/color-references"
				apiBasePath="/api/admin/catalog/color-references"
				initialValues={{
					...initialValues,
					colorChartId: initialColorChartId ?? initialValues.colorChartId,
				}}
				fields={getColorReferenceFields(colorCharts)}
				cancelHref="/admin/catalog/color-references"
				showHeader={false}
				editPathPattern="/admin/catalog/color-references/[id]/edit"
				createRedirectToEdit
			/>
		</CatalogAdminCreateShell>
	);
}
