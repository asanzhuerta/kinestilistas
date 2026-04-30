import CatalogAdminCreateShell from "@/app/admin/catalog/_shared/CatalogAdminCreateShell";
import {
	getProductSubcategoryFields,
	getProductSubcategoryInitialValues,
} from "@/app/admin/catalog/_shared/catalog-form-config";
import CatalogAdminForm from "@/app/components/catalog-admin/CatalogAdminForm";
import { listProductLines } from "@/lib/typeorm/services/catalog/product-line";

export default async function NewProductSubcategoryPage() {
	const productLines = await listProductLines();

	return (
		<CatalogAdminCreateShell
			title="Nueva subcategoria"
			subtitle="Crea una agrupacion interna para una linea cuando necesite identidad o imagen propia."
			backHref="/admin/catalog/product-subcategories"
			backLabel="subcategorias"
		>
			<CatalogAdminForm
				entityLabel="subcategoria"
				entityLabelPlural="las subcategorias del catalogo"
				basePath="/admin/catalog/product-subcategories"
				apiBasePath="/api/admin/catalog/product-subcategories"
				initialValues={getProductSubcategoryInitialValues()}
				fields={getProductSubcategoryFields(productLines)}
				cancelHref="/admin/catalog/product-subcategories"
				showHeader={false}
				editPathPattern="/admin/catalog/product-subcategories/[id]/edit"
				createRedirectToEdit
			/>
		</CatalogAdminCreateShell>
	);
}
