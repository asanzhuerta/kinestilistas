"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import H1Title from "@/app/components/H1Title";
import EntityTableFilters from "@/app/components/entity-table/EntityTableFilters";
import EntityTableView from "@/app/components/entity-table/EntityTableView";
import type { EntityTableItem } from "@/app/components/entity-table/entity-table-types";
import { useEntityTable } from "@/app/components/entity-table/useEntityTable";
import UserAvatar from "@/app/components/users/UserAvatar";
import {
	buildCategoryBadgeClassMap,
	getCategoryBadgeClass,
} from "@/app/components/catalog/category-badge-palette";
import {
	mapColorReferencesToEntityTableItems,
} from "./catalog-table-mappers";
import type {
	SerializedColorChartListItem,
	SerializedColorReferenceListItem,
} from "./coloration-serializers";

type Props = {
	title: string;
	subtitle: string;
	colorCharts: SerializedColorChartListItem[];
	colorReferences: SerializedColorReferenceListItem[];
	detailBasePath: string;
};

type ProductLineGroup = NonNullable<SerializedColorChartListItem["productLine"]>;

function buildProductLineItems(
	colorCharts: SerializedColorChartListItem[],
	colorReferences: SerializedColorReferenceListItem[],
): EntityTableItem[] {
	const chartGroups = new Map<
		string,
		{
			productLine: ProductLineGroup;
			charts: SerializedColorChartListItem[];
			references: SerializedColorReferenceListItem[];
		}
	>();

	for (const colorChart of colorCharts) {
		if (!colorChart.productLine) {
			continue;
		}

		const currentGroup = chartGroups.get(colorChart.product_line_id) ?? {
			productLine: colorChart.productLine,
			charts: [],
			references: [],
		};

		currentGroup.charts.push(colorChart);
		chartGroups.set(colorChart.product_line_id, currentGroup);
	}

	for (const colorReference of colorReferences) {
		const productLineId = colorReference.colorChart?.productLine?.id;

		if (!productLineId) {
			continue;
		}

		const currentGroup = chartGroups.get(productLineId);

		if (!currentGroup) {
			continue;
		}

		currentGroup.references.push(colorReference);
	}

	return Array.from(chartGroups.values()).map(
		({ productLine, charts, references }) => ({
			id: productLine.id,
			title: productLine.name,
			subtitle: productLine.description || "",
			imageUrl: productLine.image_url,
			category: productLine.productCategory?.name ?? "Sin categoria",
			primaryDate: String(9999 - (productLine.display_order ?? 0)).padStart(
				4,
				"0",
			),
			badges: [],
			fields: [],
			searchText: [
				productLine.name,
				productLine.description,
				productLine.productCategory?.name,
				...charts.flatMap((colorChart) => [
					colorChart.name,
					colorChart.description,
				]),
				...references.flatMap((reference) => [
					reference.code,
					reference.name,
					reference.description,
					reference.colorChart?.name,
				]),
			]
				.filter(Boolean)
				.join(" "),
		}),
	);
}

export default function ColorChartsExplorer({
	title,
	subtitle,
	colorCharts,
	colorReferences,
	detailBasePath,
}: Props) {
	const [showAllColors, setShowAllColors] = useState(false);
	const items = useMemo(
		() => buildProductLineItems(colorCharts, colorReferences),
		[colorCharts, colorReferences],
	);
	const table = useEntityTable(items, {
		categoryLabel: "Categoria",
		showImageFilter: true,
		defaultSortField: "title",
		defaultSortDirection: "asc",
	});
	const [expandedLineId, setExpandedLineId] = useState<string | null>(null);
	const [expandedChartId, setExpandedChartId] = useState<string | null>(null);

	const chartGroupsByLineId = useMemo(() => {
		return colorCharts.reduce<Map<string, SerializedColorChartListItem[]>>((acc, colorChart) => {
			if (!colorChart.productLine) {
				return acc;
			}

			const currentCharts = acc.get(colorChart.product_line_id) ?? [];
			currentCharts.push(colorChart);
			acc.set(colorChart.product_line_id, currentCharts);
			return acc;
		}, new Map());
	}, [colorCharts]);

	const colorReferencesByChartId = useMemo(() => {
		return colorReferences.reduce<Map<string, SerializedColorReferenceListItem[]>>((acc, colorReference) => {
			const currentReferences = acc.get(colorReference.color_chart_id) ?? [];
			currentReferences.push(colorReference);
			acc.set(colorReference.color_chart_id, currentReferences);
			return acc;
		}, new Map());
	}, [colorReferences]);

	const lineItemById = useMemo(
		() => new Map(items.map((item) => [item.id, item])),
		[items],
	);
	const filteredLineItems = table.filteredAndSortedItems
		.map((item) => lineItemById.get(item.id))
		.filter(Boolean) as EntityTableItem[];
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
	const lineBadgeClassMap = useMemo(
		() =>
			buildCategoryBadgeClassMap(
				colorCharts.map((colorChart) => colorChart.productLine?.name),
			),
		[colorCharts],
	);
	const categoryBadgeClassMap = useMemo(
		() =>
			buildCategoryBadgeClassMap(
				colorCharts.map(
					(colorChart) => colorChart.productLine?.productCategory?.name,
				),
			),
		[colorCharts],
	);
	const colorChartBadgeClassMap = useMemo(
		() => buildCategoryBadgeClassMap(colorCharts.map((colorChart) => colorChart.name)),
		[colorCharts],
	);
	const allColorReferenceItems = useMemo(
		() =>
			mapColorReferencesToEntityTableItems(
				colorReferences,
				lineBadgeClassMap,
				colorChartBadgeClassMap,
			).toSorted((left, right) =>
				(left.primaryDate ?? "").localeCompare(right.primaryDate ?? "", "es"),
			),
		[colorReferences, lineBadgeClassMap, colorChartBadgeClassMap],
	);
	const flatColorsTable = useEntityTable(allColorReferenceItems, {
		categoryLabel: "Linea comercial",
		defaultSortField: "primaryDate",
		defaultSortDirection: "asc",
		primaryDateLabel: "Codigo",
		extraFilters: [
			{
				key: "colorChart",
				label: "Carta de color",
				allLabel: "Todas",
				dependsOn: ["category"],
			},
		],
	});

	function toggleLine(lineId: string) {
		setExpandedLineId((current) => (current === lineId ? null : lineId));
		setExpandedChartId(null);
	}

	function toggleChart(chartId: string) {
		setExpandedChartId((current) => (current === chartId ? null : chartId));
	}

	return (
		<div className="space-y-6">
			<H1Title title={title} subtitle={subtitle} />

			<div className="flex justify-end">
				<button
					type="button"
					onClick={() => setShowAllColors((current) => !current)}
					className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
				>
					{showAllColors ? "Volver a la vista por cartas" : "Ver todos los tonos"}
				</button>
			</div>

			<EntityTableFilters
				search={showAllColors ? flatColorsTable.search : table.search}
				setSearch={showAllColors ? flatColorsTable.setSearch : table.setSearch}
				categoryFilter={
					showAllColors ? flatColorsTable.categoryFilter : table.categoryFilter
				}
				setCategoryFilter={
					showAllColors
						? flatColorsTable.setCategoryFilter
						: table.setCategoryFilter
				}
				statusFilter={showAllColors ? flatColorsTable.statusFilter : table.statusFilter}
				setStatusFilter={
					showAllColors ? flatColorsTable.setStatusFilter : table.setStatusFilter
				}
				hasImageFilter={
					showAllColors ? flatColorsTable.hasImageFilter : table.hasImageFilter
				}
				setHasImageFilter={
					showAllColors
						? flatColorsTable.setHasImageFilter
						: table.setHasImageFilter
				}
				hideInactiveItems={
					showAllColors
						? flatColorsTable.hideInactiveItems
						: table.hideInactiveItems
				}
				setHideInactiveItems={
					showAllColors
						? flatColorsTable.setHideInactiveItems
						: table.setHideInactiveItems
				}
				extraFilterValues={
					showAllColors ? flatColorsTable.extraFilterValues : table.extraFilterValues
				}
				setExtraFilterValue={
					showAllColors
						? flatColorsTable.setExtraFilterValue
						: table.setExtraFilterValue
				}
				extraFilters={
					showAllColors
						? [
								{
									key: "colorChart",
									label: "Carta de color",
									allLabel: "Todas",
									dependsOn: ["category"],
								},
							]
						: []
				}
				extraFilterOptions={
					showAllColors ? flatColorsTable.extraFilterOptions : {}
				}
				sortField={showAllColors ? flatColorsTable.sortField : table.sortField}
				setSortField={
					showAllColors ? flatColorsTable.setSortField : table.setSortField
				}
				sortDirection={
					showAllColors ? flatColorsTable.sortDirection : table.sortDirection
				}
				setSortDirection={
					showAllColors
						? flatColorsTable.setSortDirection
						: table.setSortDirection
				}
				categories={showAllColors ? flatColorsTable.categories : table.categories}
				statuses={[]}
				filteredCount={
					showAllColors
						? flatColorsTable.filteredAndSortedItems.length
						: filteredChartGroups.length
				}
				totalCount={
					showAllColors
						? allColorReferenceItems.length
						: Array.from(chartGroupsByLineId.keys()).length
				}
				resetFilters={showAllColors ? flatColorsTable.resetFilters : table.resetFilters}
				config={
					showAllColors
						? {
								categoryLabel: "Linea comercial",
								defaultSortField: "primaryDate",
								defaultSortDirection: "asc",
								primaryDateLabel: "Codigo",
								extraFilters: [
									{
										key: "colorChart",
										label: "Carta de color",
										allLabel: "Todas",
										dependsOn: ["category"],
									},
								],
							}
						: {
								categoryLabel: "Categoria",
								showImageFilter: true,
								defaultSortField: "title",
								defaultSortDirection: "asc",
							}
				}
			/>

			{showAllColors ? (
				<EntityTableView
					items={flatColorsTable.filteredAndSortedItems}
					config={{
						cardVariant: "color-reference",
						gridClassName:
							"grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4",
					}}
					emptyMessage="No hay tonos publicados con los filtros actuales."
				/>
			) : (
			<div className="space-y-4">
				{filteredChartGroups.length === 0 ? (
					<div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-md">
						No hay lineas de coloracion que coincidan con los filtros actuales.
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
							<div className="flex flex-wrap items-start gap-4 p-5">
								<UserAvatar
									name={productLine.name}
									imageUrl={productLine.image_url}
									size="xl"
									shape="soft-square"
									imageFit="contain"
									imageBackgroundClass="bg-white"
									className="flex-shrink-0"
								/>

								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap gap-2">
										<span
											className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getCategoryBadgeClass(
												productLine.productCategory?.name,
												categoryBadgeClassMap,
											)}`}
										>
											{productLine.productCategory?.name ?? "Sin categoria"}
										</span>
										<span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
											{charts.length === 1 ? "1 carta" : `${charts.length} cartas`}
										</span>
									</div>

									<button
										type="button"
										onClick={() => toggleLine(productLineId)}
										className="mt-3 text-left text-2xl font-semibold tracking-tight text-slate-900 transition hover:text-slate-700"
									>
										{productLine.name}
									</button>

									{productLine.description ? (
										<p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
											{productLine.description}
										</p>
									) : null}
								</div>

								<button
									type="button"
									onClick={() => toggleLine(productLineId)}
									aria-expanded={isExpanded}
									className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
								>
									{isExpanded ? "Ocultar cartas" : "Ver cartas"}
								</button>
							</div>

							{isExpanded ? (
								<div className="border-t border-slate-200 bg-slate-50/70 p-4">
									<div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
										{charts.map((colorChart) => {
											const isChartExpanded = expandedChartId === colorChart.id;
											const chartReferences =
												colorReferencesByChartId.get(colorChart.id) ?? [];

											return (
												<article
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
																			colorChart.productLine?.name,
																			lineBadgeClassMap,
																		)}`}
																	>
																		{colorChart.productLine?.name ?? "Sin linea"}
																	</span>
																	<span className="inline-flex rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm">
																		{chartReferences.length === 1
																			? "1 tono"
																			: `${chartReferences.length} tonos`}
																	</span>
																</div>
															</div>

															<div className="max-w-[18ch]">
																<button
																	type="button"
																	onClick={() => toggleChart(colorChart.id)}
																	className="text-left text-2xl font-semibold leading-tight tracking-tight text-white transition hover:text-slate-100"
																	style={{
																		textShadow:
																			"0 3px 16px rgba(0, 0, 0, 0.72)",
																	}}
																>
																	{colorChart.name}
																</button>
															</div>
														</div>
													</div>

													<div className="p-4">
														<div className="flex flex-wrap gap-2">
															<Link
																href={`${detailBasePath}/${colorChart.id}`}
																className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
															>
																Abrir carta
															</Link>
															<button
																type="button"
																onClick={() => toggleChart(colorChart.id)}
																className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
															>
																{isChartExpanded ? "Ocultar tonos" : "Ver tonos"}
															</button>
														</div>
													</div>

													{isChartExpanded ? (
														<div className="mt-4">
															<EntityTableView
																items={mapColorReferencesToEntityTableItems(
																	chartReferences,
																	lineBadgeClassMap,
																	colorChartBadgeClassMap,
																)}
																config={{
																	cardVariant: "color-reference",
																	gridClassName:
																		"grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3",
																}}
																emptyMessage="No hay tonos publicados en esta carta."
															/>
														</div>
													) : null}
												</article>
											);
										})}
									</div>
								</div>
							) : null}
						</article>
					);
				})}
			</div>
			)}
		</div>
	);
}
