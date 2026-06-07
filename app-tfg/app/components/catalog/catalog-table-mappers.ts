import type { EntityTableBadge, EntityTableItem } from "@/app/components/entity-table/entity-table-types";
import { toIsoString } from "@/lib/utils/date-serialization";
import type {
	listColorCharts,
	listColorReferences,
} from "@/lib/typeorm/services/catalog/color-chart";
import type { listProducts } from "@/lib/typeorm/services/catalog/product";
import type { SerializedColorReferenceListItem } from "./coloration-serializers";
import {
	buildCategoryBadgeClassMap,
	getCategoryBadgeClass,
} from "./category-badge-palette";

function normalizeSortSegment(value: string) {
	return value
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase()
		.trim();
}

export function buildColorReferenceSortKey(
	code: string | null | undefined,
	name: string | null | undefined,
) {
	const normalizedCode = String(code ?? "").trim();

	if (/^\d+(?:\.\d+)*$/.test(normalizedCode)) {
		const segments = normalizedCode
			.split(".")
			.map((segment) => segment.padStart(4, "0"))
			.join(".");
		return `0|${segments}|${normalizeSortSegment(name ?? "")}`;
	}

	const alphaSeed = normalizedCode || String(name ?? "");
	return `1|${normalizeSortSegment(alphaSeed)}|${normalizeSortSegment(name ?? "")}`;
}

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
	const subcategoryBadgeClassMap = buildCategoryBadgeClassMap(
		products.map((product) => product.productSubcategory?.name),
	);

	return products.map((product) => ({
		id: product.id,
		title: product.name,
		subtitle: product.description || "",
		imageUrl: product.image_url,
		secondaryImageUrl: product.productLine?.image_url ?? null,
		secondaryImageLabel: product.productLine?.name ?? null,
		secondaryBadge: buildBadge(
			product.productSubcategory?.name,
			getCategoryBadgeClass(
				product.productSubcategory?.name,
				subcategoryBadgeClassMap,
			),
		),
		category: product.productCategory?.name ?? "Sin categoría",
		primaryDate: toIsoString(product.created_at),
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
		subtitle: colorChart.description || "Carta cromática lista para consulta",
		imageUrl: colorChart.image_url,
		category: colorChart.productLine?.productCategory?.name ?? "Sin categoría",
		primaryDate: toIsoString(colorChart.created_at),
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

export function mapColorReferencesToEntityTableItems(
	colorReferences:
		| Awaited<ReturnType<typeof listColorReferences>>
		| SerializedColorReferenceListItem[],
	lineBadgeClassMap: Map<string, string>,
	colorChartBadgeClassMap: Map<string, string>,
	options?: {
		hrefBasePath?: string;
	},
): EntityTableItem[] {
	return colorReferences.map((colorReference) => ({
		id: colorReference.id,
		title: `${colorReference.code} - ${colorReference.name}`,
		subtitle: "",
		href: options?.hrefBasePath
			? `${options.hrefBasePath}/${colorReference.id}/edit`
			: null,
		imageUrl:
			colorReference.image_url ??
			colorReference.thumb_image_url ??
			null,
		category: colorReference.colorChart?.productLine?.name ?? "Sin línea",
		primaryDate: buildColorReferenceSortKey(
			colorReference.code,
			colorReference.name,
		),
		badges: [
			buildBadge(
				colorReference.colorChart?.productLine?.name,
				getCategoryBadgeClass(
					colorReference.colorChart?.productLine?.name,
					lineBadgeClassMap,
				),
			),
			buildBadge(
				colorReference.colorChart?.name,
				getCategoryBadgeClass(
					colorReference.colorChart?.name,
					colorChartBadgeClassMap,
				),
			),
		].filter(Boolean) as EntityTableBadge[],
		fields: [],
		filterValues: {
			colorChart: colorReference.colorChart?.name ?? null,
		},
		searchText: [
			colorReference.code,
			colorReference.name,
			colorReference.description,
			colorReference.colorChart?.name,
			colorReference.colorChart?.productLine?.name,
		]
			.filter(Boolean)
			.join(" "),
	}));
}
