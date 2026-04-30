import { notFound } from "next/navigation";
import CatalogAdminEditShell from "@/app/admin/catalog/_shared/CatalogAdminEditShell";
import {
	getProductSubcategoryFields,
	getProductSubcategoryInitialValues,
} from "@/app/admin/catalog/_shared/catalog-form-config";
import CatalogAdminForm from "@/app/components/catalog-admin/CatalogAdminForm";
import { listProductLines } from "@/lib/typeorm/services/catalog/product-line";
import { getProductSubcategoryById } from "@/lib/typeorm/services/catalog/product-subcategory";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function EditProductSubcategoryPage({ params }: Props) {
	const { id } = await params;
	const [productSubcategory, productLines] = await Promise.all([
		getProductSubcategoryById(id),
		listProductLines(),
	]);

	if (!productSubcategory) {
		notFound();
	}

	return (
		<CatalogAdminEditShell
			title="Editar subcategoria"
			subtitle={`Actualiza imagen, linea y posicion para ${productSubcategory.name}.`}
			backHref="/admin/catalog/product-subcategories"
			backLabel="subcategorias"
		>
			<CatalogAdminForm
				entityLabel="subcategoria"
				entityLabelPlural="las subcategorias del catalogo"
				basePath="/admin/catalog/product-subcategories"
				apiBasePath="/api/admin/catalog/product-subcategories"
				initialValues={getProductSubcategoryInitialValues(productSubcategory)}
				fields={getProductSubcategoryFields(productLines)}
				editingId={productSubcategory.id}
				cancelHref="/admin/catalog/product-subcategories"
				showHeader={false}
			/>
		</CatalogAdminEditShell>
	);
}
