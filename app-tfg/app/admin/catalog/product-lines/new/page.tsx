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
	const [productCategories, resolvedSearchParams] = await Promise.all([
		listProductCategories(),
		searchParams,
	]);
	const initialValues = getProductLineInitialValues();
	const initialProductCategoryId = getSingleSearchParamValue(
		resolvedSearchParams?.productCategoryId,
	);

	return (
		<CatalogAdminCreateShell
			title="Nueva línea comercial"
			subtitle="Da de alta una línea y vinculala a la categoría adecuada."
			backHref="/admin/catalog/product-lines"
		>
			<CatalogAdminForm
				entityLabel="línea comercial"
				entityLabelPlural="las líneas comerciales"
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
