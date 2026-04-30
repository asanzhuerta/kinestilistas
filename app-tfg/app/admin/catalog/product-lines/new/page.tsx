import CatalogAdminCreateShell from "@/app/admin/catalog/_shared/CatalogAdminCreateShell";
import {
	getProductLineFields,
	getProductLineInitialValues,
} from "@/app/admin/catalog/_shared/catalog-form-config";
import CatalogAdminForm from "@/app/components/catalog-admin/CatalogAdminForm";
import { listProductCategories } from "@/lib/typeorm/services/catalog/product-category";

export default async function NewProductLinePage() {
	const productCategories = await listProductCategories();

	return (
		<CatalogAdminCreateShell
			title="Nueva linea comercial"
			subtitle="Da de alta una linea y vinculala a la categoria adecuada."
			backHref="/admin/catalog/product-lines"
			backLabel="lineas comerciales"
		>
			<CatalogAdminForm
				entityLabel="linea comercial"
				entityLabelPlural="las lineas comerciales"
				basePath="/admin/catalog/product-lines"
				apiBasePath="/api/admin/catalog/product-lines"
				initialValues={getProductLineInitialValues()}
				fields={getProductLineFields(productCategories)}
				cancelHref="/admin/catalog/product-lines"
				showHeader={false}
				editPathPattern="/admin/catalog/product-lines/[id]/edit"
				createRedirectToEdit
			/>
		</CatalogAdminCreateShell>
	);
}
