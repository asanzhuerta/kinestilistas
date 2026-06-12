import { PRODUCT_STATUS_IDS } from "@/lib/typeorm/constants/catalog-ids";
import { isSyntheticProductReference } from "@/lib/catalog/product-reference";
import { createCatalogDataCache } from "@/lib/cache/catalog-cache";
import {
	listColorCharts,
	getColorChartById,
	getColorReferenceById,
	listColorReferences,
} from "./color-chart";
import { getProductById, listProducts } from "./product";
import { listSupportResources } from "./support-resource";

function normalizeCategoryName(value: string | null | undefined) {
	return String(value ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.toUpperCase();
}

function shouldIncludeRelatedColorCharts(product: NonNullable<Awaited<ReturnType<typeof getProductById>>>) {
	const normalizedCategoryName = normalizeCategoryName(
		product.productCategory?.name,
	);

	// In M3, tint products without a real ERP reference are persisted
	// with a synthetic placeholder and are the only ones that should
	// expose associated color charts in their product detail.
	return (
		normalizedCategoryName === "COLORACION" &&
		isSyntheticProductReference(product.reference)
	);
}

async function listActiveCatalogProductsUncached() {
	return listProducts({
		statusId: PRODUCT_STATUS_IDS.ACTIVE,
	});
}

async function getActiveCatalogProductDetailUncached(productId: string) {
	const product = await getProductById(productId);

	if (!product || product.status_id !== PRODUCT_STATUS_IDS.ACTIVE) {
		return null;
	}

	const includeRelatedColorCharts = shouldIncludeRelatedColorCharts(product);

	const [
		productResources,
		lineResources,
		relatedColorCharts,
		orderableColorReferences,
	] = await Promise.all([
		listSupportResources({ productId }),
		listSupportResources({ productLineId: product.product_line_id }),
		includeRelatedColorCharts
			? listColorCharts({ productLineId: product.product_line_id })
			: Promise.resolve([] as Awaited<ReturnType<typeof listColorCharts>>),
		listColorReferences({
			productId: product.id,
			orderableOnly: true,
		}),
	]);

	const supportResources = [
		...new Map(
			[...productResources, ...lineResources].map((resource) => [
				resource.id,
				{
					id: resource.id,
					title: resource.title,
					description: resource.description,
					resourceUrl: resource.resource_url,
					resourceTypeName: resource.resourceType?.name ?? null,
					scopeLabel:
						resource.product_id === product.id ? "Producto" : "Línea",
				},
			]),
		).values(),
	];

	return {
		product,
		supportResources,
		relatedColorCharts,
		orderableColorReferences,
	};
}

async function listCatalogColorChartsWithReferencesUncached() {
	const [colorCharts, colorReferences] = await Promise.all([
		listColorCharts(),
		listColorReferences(),
	]);

	return {
		colorCharts,
		colorReferences,
	};
}

async function getCatalogColorChartDetailUncached(colorChartId: string) {
	return getColorChartById(colorChartId);
}

async function getCatalogColorReferenceDetailUncached(colorReferenceId: string) {
	return getColorReferenceById(colorReferenceId);
}

export const listActiveCatalogProducts = createCatalogDataCache(
	listActiveCatalogProductsUncached,
	["catalog", "active-products"],
);

export const getActiveCatalogProductDetail = createCatalogDataCache(
	getActiveCatalogProductDetailUncached,
	["catalog", "active-product-detail"],
);

export const listCatalogColorChartsWithReferences = createCatalogDataCache(
	listCatalogColorChartsWithReferencesUncached,
	["catalog", "color-charts-with-references"],
);

export const getCatalogColorChartDetail = createCatalogDataCache(
	getCatalogColorChartDetailUncached,
	["catalog", "color-chart-detail"],
);

export const getCatalogColorReferenceDetail = createCatalogDataCache(
	getCatalogColorReferenceDetailUncached,
	["catalog", "color-reference-detail"],
);
