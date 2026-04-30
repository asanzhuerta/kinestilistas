import CatalogAdminCreateShell from "@/app/admin/catalog/_shared/CatalogAdminCreateShell";
import {
	getSupportResourceFields,
	getSupportResourceInitialValues,
} from "@/app/admin/catalog/_shared/catalog-form-config";
import CatalogAdminForm from "@/app/components/catalog-admin/CatalogAdminForm";
import { listSupportResourceTypes } from "@/lib/typeorm/services/catalog/lookups";
import { listProductLines } from "@/lib/typeorm/services/catalog/product-line";
import { listProducts } from "@/lib/typeorm/services/catalog/product";

export default async function NewSupportResourcePage() {
	const [supportResourceTypes, products, productLines] = await Promise.all([
		listSupportResourceTypes(),
		listProducts(),
		listProductLines(),
	]);

	return (
		<CatalogAdminCreateShell
			title="Nuevo recurso de apoyo"
			subtitle="Añade fichas, catalogos o materiales formativos asociados al catalogo."
			backHref="/admin/catalog/support-resources"
			backLabel="recursos"
		>
			<CatalogAdminForm
				entityLabel="recurso"
				entityLabelPlural="los recursos de apoyo"
				basePath="/admin/catalog/support-resources"
				apiBasePath="/api/admin/catalog/support-resources"
				initialValues={getSupportResourceInitialValues()}
				fields={getSupportResourceFields({
					supportResourceTypes,
					products,
					productLines,
				})}
				cancelHref="/admin/catalog/support-resources"
				showHeader={false}
				editPathPattern="/admin/catalog/support-resources/[id]/edit"
				createRedirectToEdit
			/>
		</CatalogAdminCreateShell>
	);
}
