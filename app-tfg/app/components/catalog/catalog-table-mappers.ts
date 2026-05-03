import type { EntityTableBadge, EntityTableItem } from "@/app/components/entity-table/entity-table-types";
import type { listColorCharts } from "@/lib/typeorm/services/catalog/color-chart";
import type { listProducts } from "@/lib/typeorm/services/catalog/product";
import {
	buildCategoryBadgeClassMap,
	getCategoryBadgeClass,
} from "./category-badge-palette";

function buildBadge(
	label: string | null | undefined,
	className: string,
): EntityTableBadge | null {
	if (!label) {
		return null;
	}

	return {
		label,
		className,
	};
}

export function mapCatalogProductsToEntityTableItems(
	products: Awaited<ReturnType<typeof listProducts>>,
	detailBasePath: string,
): EntityTableItem[] {
	const categoryBadgeClassMap = buildCategoryBadgeClassMap(
		products.map((product) => product.productCategory?.name),
	);

	return products.map((product) => ({
		id: product.id,
		title: product.name,
		subtitle: product.description || "",
		imageUrl: product.image_url,
		secondaryImageUrl: product.productLine?.image_url ?? null,
		secondaryImageLabel: product.productLine?.name ?? null,
		category: product.productCategory?.name ?? "Sin categoria",
		primaryDate: product.created_at.toISOString(),
		badges: [
			buildBadge(
				product.productCategory?.name,
				getCategoryBadgeClass(
					product.productCategory?.name,
					categoryBadgeClassMap,
				),
			),
		].filter(Boolean) as EntityTableBadge[],
		fields: [
			{ label: "Formato", value: product.format ?? "-" },
			{
				label: "Packing",
				value:
					product.packing !== null && product.packing !== undefined
						? String(product.packing)
						: "-",
			},
		],
		actions: [
			{
				label: "Ver producto",
				href: `${detailBasePath}/${product.id}`,
				variant: "primary",
			},
		],
		filterValues: {
			productLine: product.productLine?.name ?? null,
			subcategory: product.productSubcategory?.name ?? null,
		},
		searchText: [
			product.name,
			product.reference,
			product.description,
			product.technical_info,
			product.format,
			product.packing !== null && product.packing !== undefined
				? String(product.packing)
				: null,
			product.supplier,
			product.productCategory?.name,
			product.productLine?.name,
			product.productSubcategory?.name,
		]
			.filter(Boolean)
			.join(" "),
	}));
}

export function mapColorChartsToEntityTableItems(
	colorCharts: Awaited<ReturnType<typeof listColorCharts>>,
	referenceCountByChartId: Record<string, number>,
	categoryBadgeClassMap: Map<string, string>,
	detailBasePath: string,
): EntityTableItem[] {
	return colorCharts.map((colorChart) => ({
		id: colorChart.id,
		title: colorChart.name,
		subtitle: colorChart.description || "Carta cromatica lista para consulta",
		imageUrl: colorChart.image_url,
		category: colorChart.productLine?.productCategory?.name ?? "Sin categoria",
		primaryDate: colorChart.created_at.toISOString(),
		badges: [
			buildBadge(
				colorChart.productLine?.productCategory?.name,
				getCategoryBadgeClass(
					colorChart.productLine?.productCategory?.name,
					categoryBadgeClassMap,
				),
			),
			buildBadge(
				colorChart.productLine?.name,
				"bg-sky-100 text-sky-700 border border-sky-200",
			),
			buildBadge(
				`${referenceCountByChartId[colorChart.id] ?? 0} tonos`,
				"bg-slate-100 text-slate-700 border border-slate-200",
			),
		].filter(Boolean) as EntityTableBadge[],
		fields: [],
		actions: [
			{
				label: "Ver carta",
				href: `${detailBasePath}/${colorChart.id}`,
				variant: "primary",
			},
		],
		filterValues: {
			productLine: colorChart.productLine?.name ?? null,
		},
		searchText: [
			colorChart.name,
			colorChart.description,
			colorChart.productLine?.name,
			colorChart.productLine?.productCategory?.name,
		]
			.filter(Boolean)
			.join(" "),
	}));
}
