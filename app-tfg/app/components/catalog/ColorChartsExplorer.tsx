"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import H1Title from "@/app/components/H1Title";
import EntityTableFilters from "@/app/components/entity-table/EntityTableFilters";
import type { EntityTableItem } from "@/app/components/entity-table/entity-table-types";
import { useEntityTable } from "@/app/components/entity-table/useEntityTable";
import UserAvatar from "@/app/components/users/UserAvatar";
import {
	buildCategoryBadgeClassMap,
	getCategoryBadgeClass,
} from "@/app/components/catalog/category-badge-palette";
import {
	buildColorReferenceSortKey,
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
	toneDetailBasePath: string;
};

type ProductLineGroup = NonNullable<SerializedColorChartListItem["productLine"]>;
type ColorationViewMode = "rows" | "cards" | "all";
type ToneRow = {
	toneNumber: number;
	references: SerializedColorReferenceListItem[];
};

const PRIMARY_TONE_NUMBERS = Array.from({ length: 12 }, (_, index) => index + 1);

function getPrimaryToneNumber(code: string | null | undefined) {
	const normalizedCode = String(code ?? "").trim().replace(",", ".");
	const match = normalizedCode.match(/^0*(\d{1,2})(?:\.|\s|-|$)/);

	if (!match) {
		return null;
	}

	const toneNumber = Number(match[1]);

	return Number.isInteger(toneNumber) && toneNumber >= 1 && toneNumber <= 12
		? toneNumber
		: null;
}
function buildToneRows(
	colorReferences: SerializedColorReferenceListItem[],
): ToneRow[] {
	const groups = new Map<number, SerializedColorReferenceListItem[]>(
		PRIMARY_TONE_NUMBERS.map((toneNumber) => [toneNumber, []]),
	);

	for (const colorReference of colorReferences) {
		const toneNumber = getPrimaryToneNumber(colorReference.code);

		if (!toneNumber) {
			continue;
		}

		groups.get(toneNumber)?.push(colorReference);
	}

	return PRIMARY_TONE_NUMBERS.map((toneNumber) => ({
		toneNumber,
		references: (groups.get(toneNumber) ?? []).toSorted((left, right) =>
			buildColorReferenceSortKey(left.code, left.name).localeCompare(
				buildColorReferenceSortKey(right.code, right.name),
				"es",
			),
		),
	}));
}

function ViewModeButton({
	isActive,
	label,
	onClick,
}: {
	isActive: boolean;
	label: string;
	onClick: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition ${
				isActive
					? "bg-slate-950 text-white hover:bg-slate-800"
					: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
			}`}
		>
			{label}
		</button>
	);
}
function getColorReferenceImageUrl(
	colorReference: SerializedColorReferenceListItem,
) {
	return colorReference.thumb_image_url ?? colorReference.image_url ?? null;
}

function CompactToneCard({
	colorReference,
	toneDetailBasePath,
}: {
	colorReference: SerializedColorReferenceListItem;
	toneDetailBasePath: string;
}) {
	const imageUrl = getColorReferenceImageUrl(colorReference);

	return (
		<Link
			href={`${toneDetailBasePath}/${colorReference.id}`}
			title={`${colorReference.code} - ${colorReference.name}`}
			className="group relative h-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:h-20 lg:h-24"
		>
			<div
				className="absolute inset-0 bg-slate-950 bg-cover bg-center transition duration-300 group-hover:scale-[1.03]"
				style={
					imageUrl
						? {
								backgroundImage: `url(${imageUrl})`,
							}
						: undefined
				}
			/>
			<div className="absolute inset-0 bg-gradient-to-t from-slate-950/78 via-slate-950/20 to-transparent" />
			<p
				className="absolute bottom-1.5 left-2 right-2 truncate text-sm font-black leading-none text-white sm:text-base"
				style={{
					textShadow: "0 2px 10px rgba(0, 0, 0, 0.72)",
				}}
			>
				{colorReference.code}
			</p>
		</Link>
	);
}

function CompactToneGrid({
	colorReferences,
	toneDetailBasePath,
	emptyMessage,
}: {
	colorReferences: SerializedColorReferenceListItem[];
	toneDetailBasePath: string;
	emptyMessage: string;
}) {
	if (colorReferences.length === 0) {
		return (
			<div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
				{emptyMessage}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8">
			{colorReferences.map((colorReference) => (
				<CompactToneCard
					key={colorReference.id}
					colorReference={colorReference}
					toneDetailBasePath={toneDetailBasePath}
				/>
			))}
		</div>
	);
}

function ToneRowsView({
	toneRows,
	selectedToneNumber,
	setSelectedToneNumber,
	toneDetailBasePath,
}: {
	toneRows: ToneRow[];
	selectedToneNumber: number;
	setSelectedToneNumber: (toneNumber: number) => void;
	toneDetailBasePath: string;
}) {
	const selectedTone =
		toneRows.find((toneRow) => toneRow.toneNumber === selectedToneNumber) ??
		toneRows[0];
	const selectedReferences = selectedTone?.references ?? [];

	return (
		<section className="grid grid-cols-[3.25rem_minmax(0,1fr)] gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-md sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-3 sm:p-3">
			<div className="sticky top-3 grid max-h-[calc(100vh-10rem)] grid-rows-12 gap-1.5 self-start">
				{toneRows.map((toneRow) => {
					const isActive = toneRow.toneNumber === selectedToneNumber;
					const hasReferences = toneRow.references.length > 0;
					const imageUrl = toneRow.references[0]
						? getColorReferenceImageUrl(toneRow.references[0])
						: null;

					return (
						<button
							key={toneRow.toneNumber}
							type="button"
							onClick={() => setSelectedToneNumber(toneRow.toneNumber)}
							aria-pressed={isActive}
							title={`${toneRow.references.length} tonos`}
							className={`relative min-h-0 overflow-hidden rounded-xl border text-lg font-black transition sm:text-xl ${
								isActive
									? "border-slate-950 bg-slate-950 text-white shadow-sm"
									: hasReferences
										? "border-slate-200 bg-slate-50 text-white hover:border-slate-400"
										: "border-slate-100 bg-slate-50 text-slate-300"
							}`}
							style={
								imageUrl
									? {
											backgroundImage: `url(${imageUrl})`,
											backgroundPosition: "center",
											backgroundSize: "cover",
										}
									: undefined
							}
						>
							<span
								className={`absolute inset-0 ${
									hasReferences
										? isActive
											? "bg-slate-950/56"
											: "bg-slate-950/36"
										: "bg-transparent"
								}`}
							/>
							<span
								className="relative grid h-full min-h-9 place-items-center"
								style={{
									textShadow: hasReferences
										? "0 2px 10px rgba(0, 0, 0, 0.72)"
										: undefined,
								}}
							>
								{toneRow.toneNumber}
							</span>
						</button>
					);
				})}
			</div>

			<div className="min-w-0">
				<CompactToneGrid
					colorReferences={selectedReferences}
					toneDetailBasePath={toneDetailBasePath}
					emptyMessage="No hay tonos publicados con este número principal."
				/>
			</div>
		</section>
	);
}

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
			category: productLine.productCategory?.name ?? "Sin categoría",
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
	toneDetailBasePath,
}: Props) {
	const [viewMode, setViewMode] = useState<ColorationViewMode>("rows");
	const [selectedToneNumber, setSelectedToneNumber] = useState(1);
	const items = useMemo(
		() => buildProductLineItems(colorCharts, colorReferences),
		[colorCharts, colorReferences],
	);
	const table = useEntityTable(items, {
		categoryLabel: "Categoría",
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
		categoryLabel: "Línea comercial",
		defaultSortField: "primaryDate",
		defaultSortDirection: "asc",
		primaryDateLabel: "Código",
		extraFilters: [
			{
				key: "colorChart",
				label: "Carta de color",
				allLabel: "Todas",
				dependsOn: ["category"],
			},
		],
	});
	const isCardsView = viewMode === "cards";
	const isAllColorsView = viewMode === "all";
	const isRowsView = viewMode === "rows";
	const filteredColorReferenceIdSet = useMemo(
		() =>
			new Set(
				flatColorsTable.filteredAndSortedItems.map(
					(colorReferenceItem) => colorReferenceItem.id,
				),
			),
		[flatColorsTable.filteredAndSortedItems],
	);
	const filteredColorReferences = useMemo(
		() =>
			colorReferences.filter((colorReference) =>
				filteredColorReferenceIdSet.has(colorReference.id),
			),
		[colorReferences, filteredColorReferenceIdSet],
	);
	const toneRows = useMemo(
		() => buildToneRows(filteredColorReferences),
		[filteredColorReferences],
	);
	const activeTable = isCardsView ? table : flatColorsTable;
	const activeExtraFilters = isCardsView
		? []
		: [
				{
					key: "colorChart",
					label: "Carta de color",
					allLabel: "Todas",
					dependsOn: ["category"],
				},
			];
	const filteredCount = isCardsView
		? filteredChartGroups.length
		: flatColorsTable.filteredAndSortedItems.length;
	const totalCount = isCardsView
		? Array.from(chartGroupsByLineId.keys()).length
		: allColorReferenceItems.length;
	const activeConfig = isCardsView
		? {
				categoryLabel: "Categoría",
				showImageFilter: true,
				defaultSortField: "title" as const,
				defaultSortDirection: "asc" as const,
			}
		: {
				categoryLabel: "Línea comercial",
				defaultSortField: "primaryDate" as const,
				defaultSortDirection: "asc" as const,
				primaryDateLabel: "Código",
				extraFilters: activeExtraFilters,
			};

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

			<EntityTableFilters
				search={activeTable.search}
				setSearch={activeTable.setSearch}
				categoryFilter={activeTable.categoryFilter}
				setCategoryFilter={activeTable.setCategoryFilter}
				statusFilter={activeTable.statusFilter}
				setStatusFilter={activeTable.setStatusFilter}
				hasImageFilter={activeTable.hasImageFilter}
				setHasImageFilter={activeTable.setHasImageFilter}
				hideInactiveItems={activeTable.hideInactiveItems}
				setHideInactiveItems={activeTable.setHideInactiveItems}
				extraFilterValues={activeTable.extraFilterValues}
				setExtraFilterValue={activeTable.setExtraFilterValue}
				extraFilters={activeExtraFilters}
				extraFilterOptions={isCardsView ? {} : flatColorsTable.extraFilterOptions}
				sortField={activeTable.sortField}
				setSortField={activeTable.setSortField}
				sortDirection={activeTable.sortDirection}
				setSortDirection={activeTable.setSortDirection}
				categories={activeTable.categories}
				statuses={[]}
				filteredCount={filteredCount}
				totalCount={totalCount}
				resetFilters={activeTable.resetFilters}
				headerAction={
					<div className="flex flex-wrap items-center gap-2">
						<ViewModeButton
							isActive={isRowsView}
							label="Vista por filas"
							onClick={() => setViewMode("rows")}
						/>
						<ViewModeButton
							isActive={isCardsView}
							label="Vista por cartas"
							onClick={() => setViewMode("cards")}
						/>
						<ViewModeButton
							isActive={isAllColorsView}
							label="Ver todos los tonos"
							onClick={() => setViewMode("all")}
						/>
					</div>
				}
				config={activeConfig}
			/>

			{isRowsView ? (
				<ToneRowsView
					toneRows={toneRows}
					selectedToneNumber={selectedToneNumber}
					setSelectedToneNumber={setSelectedToneNumber}
					toneDetailBasePath={toneDetailBasePath}
				/>
			) : isAllColorsView ? (
				<section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-md">
					<CompactToneGrid
						colorReferences={filteredColorReferences}
						toneDetailBasePath={toneDetailBasePath}
						emptyMessage="No hay tonos publicados con los filtros actuales."
					/>
				</section>
			) : (
				<div className="space-y-4">
					{filteredChartGroups.length === 0 ? (
						<div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-md">
							No hay líneas de coloración que coincidan con los filtros actuales.
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
								<div className="grid gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
									<UserAvatar
										name={productLine.name}
										imageUrl={productLine.image_url}
										size="lg"
										shape="soft-square"
										imageFit="contain"
										imageBackgroundClass="bg-white"
										className="sm:row-start-1"
									/>

									<div className="min-w-0">
										<div className="flex flex-wrap gap-2">
											<span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
												{charts.length === 1
													? "1 carta"
													: `${charts.length} cartas`}
											</span>
										</div>

										<button
											type="button"
											onClick={() => toggleLine(productLineId)}
											className="mt-2 text-left text-xl font-semibold tracking-tight text-slate-900 transition hover:text-slate-700"
										>
											{productLine.name}
										</button>
									</div>

									{productLine.description ? (
										<p className="text-sm leading-6 text-slate-600 sm:col-span-3">
											{productLine.description}
										</p>
									) : null}

									<button
										type="button"
										onClick={() => toggleLine(productLineId)}
										aria-expanded={isExpanded}
										className="w-fit rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800 sm:justify-self-end"
									>
										{isExpanded ? "Ocultar cartas" : "Ver cartas"}
									</button>
								</div>

								<div
									className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
										isExpanded
											? "grid-rows-[1fr] opacity-100"
											: "grid-rows-[0fr] opacity-0"
									}`}
								>
									<div className="overflow-hidden">
										<div className="border-t border-slate-200 bg-slate-50/70 p-3">
											<div className="grid grid-cols-1 gap-4">
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
															className="relative min-h-32 overflow-hidden bg-slate-900 bg-cover bg-center"
															style={
																colorChart.image_url
																	? {
																			backgroundImage: `url(${colorChart.image_url})`,
																		}
																	: undefined
															}
														>
															<div className="absolute inset-0 bg-gradient-to-r from-slate-950/78 via-slate-950/34 to-slate-950/12" />
															<div className="relative flex min-h-32 flex-col justify-between gap-4 p-4 sm:flex-row sm:items-end sm:p-5">
																<div className="flex flex-wrap gap-2">
																	<div className="flex max-w-full flex-wrap gap-2">
																		<span
																			className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold shadow-sm backdrop-blur-sm ${getCategoryBadgeClass(
																				colorChart.productLine?.name,
																				lineBadgeClassMap,
																			)}`}
																		>
																			{colorChart.productLine?.name ?? "Sin línea"}
																		</span>
																		<span className="inline-flex rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-sm">
																			{chartReferences.length === 1
																				? "1 tono"
																				: `${chartReferences.length} tonos`}
																		</span>
																	</div>
																</div>

																<div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
																	<button
																		type="button"
																		onClick={() => toggleChart(colorChart.id)}
																		className="max-w-2xl text-left text-2xl font-semibold leading-tight tracking-tight text-white transition hover:text-slate-100"
																		style={{
																			textShadow:
																				"0 3px 16px rgba(0, 0, 0, 0.72)",
																		}}
																	>
																		{colorChart.name}
																	</button>

																	<div className="flex flex-wrap gap-2">
																		<Link
																			href={`${detailBasePath}/${colorChart.id}`}
																			className="rounded-xl border border-white/70 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur transition hover:bg-white"
																		>
																			Abrir carta
																		</Link>
																		<button
																			type="button"
																			onClick={() => toggleChart(colorChart.id)}
																			className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
																		>
																			{isChartExpanded
																				? "Ocultar tonos"
																				: "Ver tonos"}
																		</button>
																	</div>
																</div>
															</div>
														</div>

														<div
															className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${
																isChartExpanded
																	? "grid-rows-[1fr] opacity-100"
																	: "grid-rows-[0fr] opacity-0"
															}`}
														>
															<div className="overflow-hidden">
																<div className="border-t border-slate-200 bg-white p-3">
																	<CompactToneGrid
																		colorReferences={chartReferences}
																		toneDetailBasePath={toneDetailBasePath}
																		emptyMessage="No hay tonos publicados en esta carta."
																	/>
																</div>
															</div>
														</div>
													</article>
												);
											})}
											</div>
										</div>
									</div>
								</div>
							</article>
						);
					})}
				</div>
			)}
		</div>
	);
}
