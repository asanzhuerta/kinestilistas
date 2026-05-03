import CatalogAdminCreateShell from "@/app/admin/catalog/_shared/CatalogAdminCreateShell";
import {
	getProductCategoryFields,
	getProductCategoryInitialValues,
} from "@/app/admin/catalog/_shared/catalog-form-config";
import CatalogAdminForm from "@/app/components/catalog-admin/CatalogAdminForm";

export default function NewProductCategoryPage() {
	return (
		<CatalogAdminCreateShell
			title="Nueva categoria"
			subtitle="Crea una familia principal para ordenar el catalogo profesional."
			backHref="/admin/catalog/product-lines"
			backLabel="categorias y lineas"
		>
			<CatalogAdminForm
				entityLabel="categoria"
				entityLabelPlural="las categorias del catalogo"
				basePath="/admin/catalog/product-lines"
				apiBasePath="/api/admin/catalog/product-categories"
				initialValues={getProductCategoryInitialValues()}
				fields={getProductCategoryFields()}
				cancelHref="/admin/catalog/product-lines"
				showHeader={false}
				editPathPattern="/admin/catalog/product-categories/[id]/edit"
				createRedirectToEdit
			/>
		</CatalogAdminCreateShell>
	);
}
