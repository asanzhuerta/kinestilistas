import H1Title from "@/app/components/H1Title";
import CatalogHierarchyWorkspace from "@/app/components/catalog-admin/CatalogHierarchyWorkspace";
import { getSingleSearchParamValue } from "@/app/components/catalog-admin/catalog-navigation";
import { listProductCategories } from "@/lib/typeorm/services/catalog/product-category";
import { listProductLines } from "@/lib/typeorm/services/catalog/product-line";
import { listProductSubcategories } from "@/lib/typeorm/services/catalog/product-subcategory";

type Props = {
	searchParams?: Promise<{
		expandedCategoryId?: string | string[];
		expandedLineId?: string | string[];
	}>;
};

function serializeProductCategory(
	productCategory: Awaited<ReturnType<typeof listProductCategories>>[number],
) {
	return {
		id: productCategory.id,
		name: productCategory.name,
		description: productCategory.description,
		display_order: productCategory.display_order,
	};
}

function serializeProductLine(
	productLine: Awaited<ReturnType<typeof listProductLines>>[number],
) {
	return {
		id: productLine.id,
		name: productLine.name,
		description: productLine.description,
		product_category_id: productLine.product_category_id,
		image_url: productLine.image_url,
		display_order: productLine.display_order,
		productCategory: productLine.productCategory
			? {
					id: productLine.productCategory.id,
					name: productLine.productCategory.name,
					description: productLine.productCategory.description,
					display_order: productLine.productCategory.display_order,
			  }
			: null,
	};
}

function serializeProductSubcategory(
	productSubcategory: Awaited<ReturnType<typeof listProductSubcategories>>[number],
) {
	return {
		id: productSubcategory.id,
		name: productSubcategory.name,
		description: productSubcategory.description,
		product_line_id: productSubcategory.product_line_id,
		parent_subcategory_id: productSubcategory.parent_subcategory_id,
		display_order: productSubcategory.display_order,
	};
}

export default async function AdminProductLinesPage({ searchParams }: Props) {
	const [resolvedSearchParams, productCategories, productLines, productSubcategories] =
		await Promise.all([
			searchParams ??
				Promise.resolve<{
					expandedCategoryId?: string | string[];
					expandedLineId?: string | string[];
				}>({}),
			listProductCategories(),
			listProductLines(),
			listProductSubcategories(),
		]);

	return (
		<div className="space-y-6">
			<H1Title
				title="Categorías y líneas comerciales"
				subtitle="Gestiona la jerarquía principal del catálogo y accede al detalle filtrado de sus productos"
			/>

			<CatalogHierarchyWorkspace
				productCategories={productCategories.map(serializeProductCategory)}
				productLines={productLines.map(serializeProductLine)}
				productSubcategories={productSubcategories.map(
					serializeProductSubcategory,
				)}
				initialExpandedCategoryId={getSingleSearchParamValue(
					resolvedSearchParams.expandedCategoryId,
				)}
				initialExpandedLineId={getSingleSearchParamValue(
					resolvedSearchParams.expandedLineId,
				)}
			/>
		</div>
	);
}
