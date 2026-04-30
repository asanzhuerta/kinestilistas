import CatalogAdminCreateShell from "@/app/admin/catalog/_shared/CatalogAdminCreateShell";
import {
	getProductFields,
	getProductInitialValues,
} from "@/app/admin/catalog/_shared/catalog-form-config";
import CatalogAdminForm from "@/app/components/catalog-admin/CatalogAdminForm";
import { listProductStatuses } from "@/lib/typeorm/services/catalog/lookups";
import { listProductCategories } from "@/lib/typeorm/services/catalog/product-category";
import { listProductLines } from "@/lib/typeorm/services/catalog/product-line";

export default async function NewProductPage() {
	const [productCategories, productLines, productStatuses] = await Promise.all([
		listProductCategories(),
		listProductLines(),
		listProductStatuses(),
	]);

	return (
		<CatalogAdminCreateShell
			title="Nuevo producto"
			subtitle="Crea una referencia completa con su linea, estado, imagen y datos comerciales."
			backHref="/admin/catalog/products"
			backLabel="productos"
		>
			<CatalogAdminForm
				entityLabel="producto"
				entityLabelPlural="los productos del catalogo"
				basePath="/admin/catalog/products"
				apiBasePath="/api/admin/catalog/products"
				initialValues={getProductInitialValues()}
				fields={getProductFields({
					productCategories,
					productLines,
					productStatuses,
				})}
				cancelHref="/admin/catalog/products"
				showHeader={false}
				editPathPattern="/admin/catalog/products/[id]/edit"
				createRedirectToEdit
			/>
		</CatalogAdminCreateShell>
	);
}
