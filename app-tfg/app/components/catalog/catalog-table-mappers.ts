import type { EntityTableBadge, EntityTableItem } from "@/app/components/entity-table/entity-table-types";
import { formatDateShort } from "@/lib/utils/user-utils";
import type { listColorCharts } from "@/lib/typeorm/services/catalog/color-chart";
import type { listProducts } from "@/lib/typeorm/services/catalog/product";

function normalizeTag(value: string | null | undefined) {
	return String(value ?? "")
		.trim()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();
}

function getCategoryBadgeClass(categoryName: string | null | undefined) {
	const normalized = normalizeTag(categoryName);

	if (normalized.includes("color")) {
		return "bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200";
	}

	if (normalized.includes("acabado")) {
		return "bg-amber-100 text-amber-700 border border-amber-200";
	}

	if (normalized.includes("capilar")) {
		return "bg-emerald-100 text-emerald-700 border border-emerald-200";
	}

	if (normalized.includes("hombre")) {
		return "bg-slate-100 text-slate-700 border border-slate-200";
	}

	return "bg-sky-100 text-sky-700 border border-sky-200";
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
	return products.map((product) => ({
		id: product.id,
		title: product.name,
		subtitle: product.reference,
		imageUrl: product.image_url,
		category: product.productCategory?.name ?? "Sin categoria",
		primaryDate: product.created_at.toISOString(),
		badges: [
			buildBadge(
				product.productLine?.name,
				"bg-sky-100 text-sky-700 border border-sky-200",
			),
			buildBadge(
				product.productSubcategory?.name,
				"bg-violet-100 text-violet-700 border border-violet-200",
			),
		].filter(Boolean) as EntityTableBadge[],
		fields: [
			{ label: "Categoria", value: product.productCategory?.name ?? "-" },
			{ label: "Formato", value: product.format ?? "-" },
			{
				label: "Packing",
				value:
					product.packing !== null && product.packing !== undefined
						? String(product.packing)
						: "-",
			},
			{ label: "Precio", value: `${product.base_price} EUR` },
			{ label: "Proveedor", value: product.supplier ?? "-" },
			{
				label: "Alta",
				value: formatDateShort(product.created_at),
			},
		],
		actions: [
			{
				label: "Ver detalle",
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
				getCategoryBadgeClass(colorChart.productLine?.productCategory?.name),
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
