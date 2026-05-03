"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import EntityTableFilters from "@/app/components/entity-table/EntityTableFilters";
import type { EntityTableItem } from "@/app/components/entity-table/entity-table-types";
import { useEntityTable } from "@/app/components/entity-table/useEntityTable";
import UserAvatar from "@/app/components/users/UserAvatar";
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
			title: productLine?.name ?? "Sin linea",
			subtitle: "",
			imageUrl: productLine?.image_url,
			category: productLine?.productCategory?.name ?? "Sin categoria",
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
	initialExpandedLineId = null,
}: Props) {
	const items = useMemo(() => buildProductLineItems(colorCharts), [colorCharts]);
	const table = useEntityTable(items, {
		categoryLabel: "Categoria",
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
	const categoryBadgeClassMap = useMemo(
		() =>
			buildCategoryBadgeClassMap(
				colorCharts.map((colorChart) => colorChart.productLine?.productCategory?.name),
			),
		[colorCharts],
	);
	const colorChartsWithImageCount = colorCharts.filter((colorChart) =>
		Boolean(colorChart.image_url),
	).length;

	function toggleLine(lineId: string) {
		setExpandedLineId((current) => (current === lineId ? null : lineId));
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap gap-3 text-sm text-slate-600">
					<div className="rounded-full border border-slate-200 bg-white px-4 py-2">
						<span className="font-semibold text-slate-900">
							{filteredChartGroups.length}
						</span>{" "}
						lineas con cartas
					</div>
					<div className="rounded-full border border-slate-200 bg-white px-4 py-2">
						<span className="font-semibold text-slate-900">
							{colorCharts.length}
						</span>{" "}
						cartas
					</div>
					<div className="rounded-full border border-slate-200 bg-white px-4 py-2">
						<span className="font-semibold text-slate-900">
							{colorChartsWithImageCount}
						</span>{" "}
						con imagen
					</div>
				</div>

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
					categoryLabel: "Categoria",
					defaultSortField: "title",
					defaultSortDirection: "asc",
				}}
			/>

			<div className="space-y-4">
				{filteredChartGroups.length === 0 ? (
					<div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-md">
						No hay lineas con cartas de color que coincidan con los filtros actuales.
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
											{productLine.productCategory?.name ?? "Sin categoria"}
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
										Editar linea
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
										{charts.map((colorChart) => (
											<div
												key={colorChart.id}
												className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
											>
												<div className="flex items-start gap-4">
													<UserAvatar
														name={colorChart.name}
														imageUrl={colorChart.image_url}
														size="xl"
														shape="soft-square"
														imageFit="contain"
														imageBackgroundClass="bg-white"
														className="flex-shrink-0"
													/>

													<div className="min-w-0 flex-1">
														<Link
															href={buildAdminColorReferencesHref({
																category: productLine.name,
																colorChart: colorChart.name,
															})}
															className="inline-block text-lg font-semibold tracking-tight text-slate-900 transition hover:text-slate-700"
														>
															{colorChart.name}
														</Link>

														<div className="mt-4 flex flex-wrap gap-2">
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
												</div>
											</div>
										))}
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
