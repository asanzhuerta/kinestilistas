import { PRODUCT_STATUS_IDS } from "@/lib/typeorm/constants/catalog-ids";
import { listColorCharts, getColorChartById, listColorReferences } from "./color-chart";
import { getProductById, listProducts } from "./product";
import { listSupportResources } from "./support-resource";

export async function listActiveCatalogProducts() {
	return listProducts({
		statusId: PRODUCT_STATUS_IDS.ACTIVE,
	});
}

export async function getActiveCatalogProductDetail(productId: string) {
	const product = await getProductById(productId);

	if (!product || product.status_id !== PRODUCT_STATUS_IDS.ACTIVE) {
		return null;
	}

	const [productResources, lineResources, relatedColorCharts] = await Promise.all([
		listSupportResources({ productId }),
		listSupportResources({ productLineId: product.product_line_id }),
		listColorCharts({ productLineId: product.product_line_id }),
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
						resource.product_id === product.id ? "Producto" : "Linea",
				},
			]),
		).values(),
	];

	return {
		product,
		supportResources,
		relatedColorCharts,
	};
}

export async function listCatalogColorChartsWithReferences() {
	const [colorCharts, colorReferences] = await Promise.all([
		listColorCharts(),
		listColorReferences(),
	]);

	return {
		colorCharts,
		colorReferences,
	};
}

export async function getCatalogColorChartDetail(colorChartId: string) {
	return getColorChartById(colorChartId);
}
