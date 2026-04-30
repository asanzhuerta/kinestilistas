import { notFound } from "next/navigation";
import CatalogAdminEditShell from "@/app/admin/catalog/_shared/CatalogAdminEditShell";
import {
	getProductFields,
	getProductInitialValues,
} from "@/app/admin/catalog/_shared/catalog-form-config";
import CatalogAdminForm from "@/app/components/catalog-admin/CatalogAdminForm";
import { listProductCategories } from "@/lib/typeorm/services/catalog/product-category";
import { listProductLines } from "@/lib/typeorm/services/catalog/product-line";
import { listProductStatuses } from "@/lib/typeorm/services/catalog/lookups";
import { getProductById } from "@/lib/typeorm/services/catalog/product";
import { listProductSubcategories } from "@/lib/typeorm/services/catalog/product-subcategory";

type Props = {
	params: Promise<{ id: string }>;
};

export default async function EditProductPage({ params }: Props) {
	const { id } = await params;
	const [product, productCategories, productLines, productSubcategories, productStatuses] =
		await Promise.all([
			getProductById(id),
			listProductCategories(),
			listProductLines(),
			listProductSubcategories(),
			listProductStatuses(),
		]);

	if (!product) {
		notFound();
	}

	return (
		<CatalogAdminEditShell
			title="Editar producto"
			subtitle={`Ajusta datos comerciales, imagen y estado para ${product.name}.`}
			backHref="/admin/catalog/products"
			backLabel="productos"
		>
			<CatalogAdminForm
				entityLabel="producto"
				entityLabelPlural="los productos del catalogo"
				basePath="/admin/catalog/products"
				apiBasePath="/api/admin/catalog/products"
				initialValues={getProductInitialValues(product)}
				fields={getProductFields({
					productCategories,
					productLines,
					productSubcategories,
					productStatuses,
				})}
				editingId={product.id}
				cancelHref="/admin/catalog/products"
				showHeader={false}
			/>
		</CatalogAdminEditShell>
	);
}
