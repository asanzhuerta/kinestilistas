import CatalogAdminCreateShell from "@/app/admin/catalog/_shared/CatalogAdminCreateShell";
import {
	getProductLineFields,
	getProductLineInitialValues,
} from "@/app/admin/catalog/_shared/catalog-form-config";
import { getSingleSearchParamValue } from "@/app/components/catalog-admin/catalog-navigation";
import CatalogAdminForm from "@/app/components/catalog-admin/CatalogAdminForm";
import { listProductCategories } from "@/lib/typeorm/services/catalog/product-category";

type Props = {
	searchParams?: Promise<{
		productCategoryId?: string | string[];
	}>;
};

export default async function NewProductLinePage({ searchParams }: Props) {
	const productCategories = await listProductCategories();
	const resolvedSearchParams = await searchParams;
	const initialValues = getProductLineInitialValues();
	const initialProductCategoryId = getSingleSearchParamValue(
		resolvedSearchParams?.productCategoryId,
	);

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
				initialValues={{
					...initialValues,
					productCategoryId: initialProductCategoryId ?? initialValues.productCategoryId,
				}}
				fields={getProductLineFields(productCategories)}
				cancelHref="/admin/catalog/product-lines"
				showHeader={false}
				editPathPattern="/admin/catalog/product-lines/[id]/edit"
				createRedirectToEdit
			/>
		</CatalogAdminCreateShell>
	);
}
