"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { mapColorReferencesToEntityTableItems } from "@/app/components/catalog/catalog-table-mappers";
import type { SerializedColorReferenceListItem } from "@/app/components/catalog/coloration-serializers";
import EntityTableFilters from "@/app/components/entity-table/EntityTableFilters";
import EntityTableView from "@/app/components/entity-table/EntityTableView";
import type { EntityTableItem } from "@/app/components/entity-table/entity-table-types";
import { useEntityTable } from "@/app/components/entity-table/useEntityTable";
import {
	buildCategoryBadgeClassMap,
	getCategoryBadgeClass,
} from "@/app/components/catalog/category-badge-palette";
import { buildAdminColorReferencesHref } from "./catalog-navigation";

type ProductLineRow = {
	id: string;
	name: string;
	description: string | null;
	product_category_id: string;
	image_url: string | null;
	display_order: number;
	productCategory: {
		id: string;
		name: string;
		description: string | null;
		display_order: number;
	} | null;
};

type ColorChartRow = {
	id: string;
	name: string;
	description: string | null;
	image_url: string | null;
	product_line_id: string;
	productLine: ProductLineRow | null;
};

type Props = {
	colorCharts: ColorChartRow[];
	colorReferences: SerializedColorReferenceListItem[];
	initialExpandedLineId?: string | null;
};

function buildProductLineItems(
	colorCharts: ColorChartRow[],
): EntityTableItem[] {
	const chartGroups = new Map<string, ColorChartRow[]>();

	for (const colorChart of colorCharts) {
		if (!colorChart.productLine) {
			continue;
		}

		const currentCharts = chartGroups.get(colorChart.product_line_id) ?? [];
		currentCharts.push(colorChart);
		chartGroups.set(colorChart.product_line_id, currentCharts);
	}

	return Array.from(chartGroups.entries()).map(([productLineId, charts]) => {
		const productLine = charts[0]?.productLine;

		return {
			id: productLineId,
			title: productLine?.name ?? "Sin línea",
			subtitle: "",
			imageUrl: productLine?.image_url,
			category: productLine?.productCategory?.name ?? "Sin categoría",
			status: null,
			primaryDate: String(9999 - (productLine?.display_order ?? 0)).padStart(
				4,
				"0",
			),
			badges: [],
			fields: [],
			searchText: [
				productLine?.name,
				productLine?.description,
				productLine?.productCategory?.name,
				...charts.flatMap((colorChart) => [
					colorChart.name,
					colorChart.description,
				]),
			]
				.filter(Boolean)
				.join(" "),
		};
	});
}

export default function ColorChartHierarchyWorkspace({
	colorCharts,
	colorReferences,
	initialExpandedLineId = null,
}: Props) {
	const items = useMemo(() => buildProductLineItems(colorCharts), [colorCharts]);
	const table = useEntityTable(items, {
		categoryLabel: "Categoría",
		defaultSortField: "title",
		defaultSortDirection: "asc",
	});
	const [expandedLineId, setExpandedLineId] = useState<string | null>(
		initialExpandedLineId,
	);
	const chartGroupsByLineId = useMemo(() => {
		return colorCharts.reduce<Map<string, ColorChartRow[]>>((acc, colorChart) => {
			if (!colorChart.productLine) {
				return acc;
			}

			const currentCharts = acc.get(colorChart.product_line_id) ?? [];
			currentCharts.push(colorChart);
			acc.set(colorChart.product_line_id, currentCharts);
			return acc;
		}, new Map<string, ColorChartRow[]>());
	}, [colorCharts]);
	const lineItemById = useMemo(
		() => new Map(items.map((item) => [item.id, item])),
		[items],
	);
	const filteredLineItems = useMemo(() => {
		const nextLineItems: EntityTableItem[] = [];

		for (const item of table.filteredAndSortedItems) {
			const lineItem = lineItemById.get(item.id);

			if (lineItem) {
				nextLineItems.push(lineItem);
			}
		}

		return nextLineItems;
	}, [lineItemById, table.filteredAndSortedItems]);
	const filteredLineIds = new Set(filteredLineItems.map((item) => item.id));
	const filteredChartGroups = Array.from(chartGroupsByLineId.entries())
		.filter(([productLineId]) => filteredLineIds.has(productLineId))
		.sort((left, right) =>
			(left[1][0]?.productLine?.display_order ?? 0) -
				(right[1][0]?.productLine?.display_order ?? 0) ||
			(left[1][0]?.productLine?.name ?? "").localeCompare(
				right[1][0]?.productLine?.name ?? "",
				"es",
			),
		);
	const categoryBadgeClassMap = useMemo(
		() =>
			buildCategoryBadgeClassMap(
				colorCharts.map((colorChart) => colorChart.productLine?.productCategory?.name),
			),
		[colorCharts],
	);
	const lineBadgeClassMap = useMemo(
		() =>
			buildCategoryBadgeClassMap(
				colorCharts.map((colorChart) => colorChart.productLine?.name),
			),
		[colorCharts],
	);
	const colorChartBadgeClassMap = useMemo(
		() => buildCategoryBadgeClassMap(colorCharts.map((colorChart) => colorChart.name)),
		[colorCharts],
	);
	const lineCategoryBadgeClassMap = useMemo(
		() =>
			buildCategoryBadgeClassMap(
				colorCharts.map((colorChart) => colorChart.productLine?.productCategory?.name),
			),
		[colorCharts],
	);
	const colorReferencesByChartId = useMemo(() => {
		return colorReferences.reduce<Map<string, SerializedColorReferenceListItem[]>>(
			(acc, colorReference) => {
			const currentReferences = acc.get(colorReference.color_chart_id) ?? [];
			currentReferences.push(colorReference);
			acc.set(colorReference.color_chart_id, currentReferences);
			return acc;
		},
		new Map(),
		);
	}, [colorReferences]);

	function toggleLine(lineId: string) {
		setExpandedLineId((current) => (current === lineId ? null : lineId));
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-end gap-3">
				<div className="flex flex-wrap gap-2">
					<Link
						href="/admin/catalog/color-references"
						className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
					>
						Ver referencias
					</Link>
					<Link
						href="/admin/catalog/color-charts/new"
						className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
					>
						Nueva carta de color
					</Link>
				</div>
			</div>

			<EntityTableFilters
				search={table.search}
				setSearch={table.setSearch}
				categoryFilter={table.categoryFilter}
				setCategoryFilter={table.setCategoryFilter}
				statusFilter={table.statusFilter}
				setStatusFilter={table.setStatusFilter}
				hasImageFilter={table.hasImageFilter}
				setHasImageFilter={table.setHasImageFilter}
				hideInactiveItems={table.hideInactiveItems}
				setHideInactiveItems={table.setHideInactiveItems}
				extraFilterValues={table.extraFilterValues}
				setExtraFilterValue={table.setExtraFilterValue}
				extraFilters={[]}
				extraFilterOptions={{}}
				sortField={table.sortField}
				setSortField={table.setSortField}
				sortDirection={table.sortDirection}
				setSortDirection={table.setSortDirection}
				categories={table.categories}
				statuses={[]}
				filteredCount={filteredChartGroups.length}
				totalCount={Array.from(chartGroupsByLineId.keys()).length}
				resetFilters={table.resetFilters}
				config={{
					categoryLabel: "Categoría",
					defaultSortField: "title",
					defaultSortDirection: "asc",
				}}
			/>

			<div className="space-y-4">
				{filteredChartGroups.length === 0 ? (
					<div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-md">
						No hay líneas con cartas de color que coincidan con los filtros actuales.
					</div>
				) : null}

				{filteredChartGroups.map(([productLineId, charts]) => {
					const productLine = charts[0]?.productLine;

					if (!productLine) {
						return null;
					}

					const isExpanded = expandedLineId === productLineId;

					return (
						<article
							key={productLineId}
							className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md"
						>
							<div className="flex flex-wrap items-start justify-between gap-4 p-5">
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<span
											className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getCategoryBadgeClass(
												productLine.productCategory?.name,
												categoryBadgeClassMap,
											)}`}
										>
											{productLine.productCategory?.name ?? "Sin categoría"}
										</span>
										<span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
											{charts.length === 1 ? "1 carta" : `${charts.length} cartas`}
										</span>
									</div>

									<Link
										href={buildAdminColorReferencesHref({
											category: productLine.name,
										})}
										className="mt-3 inline-block text-2xl font-semibold tracking-tight text-slate-900 transition hover:text-slate-700"
									>
										{productLine.name}
									</Link>
								</div>

								<div className="flex flex-wrap items-center gap-2">
									<Link
										href={`/admin/catalog/product-lines/${productLine.id}/edit`}
										className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
									>
										Editar línea
									</Link>
									<button
										type="button"
										onClick={() => toggleLine(productLineId)}
										aria-expanded={isExpanded}
										className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
									>
										{isExpanded ? "Ocultar cartas" : "Ver cartas"}
									</button>
								</div>
							</div>

							{isExpanded ? (
								<div className="border-t border-slate-200 bg-slate-50/70 p-4">
									<div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
										{charts.map((colorChart) => {
											const chartReferences =
												colorReferencesByChartId.get(colorChart.id) ?? [];

											return (
											<div
												key={colorChart.id}
												className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
											>
												<div
													className="relative min-h-[18rem] bg-slate-100 bg-cover bg-center"
													style={
														colorChart.image_url
															? {
																	backgroundImage: `url(${colorChart.image_url})`,
																}
															: undefined
													}
												>
													<div className="flex min-h-[18rem] flex-col justify-between p-4 sm:p-5">
														<div className="flex justify-end">
															<div className="flex max-w-full flex-wrap justify-end gap-2">
																<span
																	className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm ${getCategoryBadgeClass(
																		productLine.productCategory?.name,
																		lineCategoryBadgeClassMap,
																	)}`}
																>
																	{productLine.productCategory?.name ?? "Sin categoría"}
																</span>
																<span className="inline-flex rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm">
																	{chartReferences.length === 1
																		? "1 tono"
																		: `${chartReferences.length} tonos`}
																</span>
															</div>
														</div>

														<Link
															href={buildAdminColorReferencesHref({
																category: productLine.name,
																colorChart: colorChart.name,
															})}
															className="block max-w-[18ch] text-2xl font-semibold leading-tight tracking-tight text-white transition hover:text-slate-100"
															style={{
																textShadow:
																	"0 3px 16px rgba(0, 0, 0, 0.72)",
															}}
														>
															{colorChart.name}
														</Link>
													</div>
												</div>

												<div className="p-4">
													<div className="flex flex-wrap gap-2">
														<Link
															href={`/admin/catalog/color-charts/${colorChart.id}/edit`}
															className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
														>
															Editar carta
														</Link>
														<Link
															href={`/admin/catalog/color-references/new?colorChartId=${colorChart.id}`}
															className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
														>
															Nueva referencia
														</Link>
													</div>
												</div>

												<div className="mt-4">
													<EntityTableView
														items={mapColorReferencesToEntityTableItems(
															chartReferences,
															lineBadgeClassMap,
															colorChartBadgeClassMap,
															{ hrefBasePath: "/admin/catalog/color-references" },
														).toSorted((left, right) =>
															(left.primaryDate ?? "").localeCompare(
																right.primaryDate ?? "",
																"es",
															),
														)}
														config={{
															cardVariant: "color-reference",
															gridClassName:
																"grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 2xl:grid-cols-3",
														}}
														emptyMessage="No hay tonos publicados en esta carta."
													/>
												</div>
											</div>
										);
										})}
									</div>
								</div>
							) : null}
						</article>
					);
				})}
			</div>
		</div>
	);
}
