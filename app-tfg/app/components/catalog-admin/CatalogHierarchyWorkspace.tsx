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
import { buildAdminProductsHref } from "./catalog-navigation";

type ProductCategoryRow = {
	id: string;
	name: string;
	description: string | null;
	display_order: number;
};

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

type ProductSubcategoryRow = {
	id: string;
	name: string;
	description: string | null;
	product_line_id: string;
	parent_subcategory_id: string | null;
	display_order: number;
};

type ProductSubcategoryTreeNode = ProductSubcategoryRow & {
	children: ProductSubcategoryTreeNode[];
};

type Props = {
	productCategories: ProductCategoryRow[];
	productLines: ProductLineRow[];
	productSubcategories: ProductSubcategoryRow[];
	initialExpandedCategoryId?: string | null;
	initialExpandedLineId?: string | null;
};

function sortProductSubcategoryTree(
	nodes: ProductSubcategoryTreeNode[],
): ProductSubcategoryTreeNode[] {
	return nodes
		.toSorted((left, right) => {
			if (left.display_order !== right.display_order) {
				return left.display_order - right.display_order;
			}

			return left.name.localeCompare(right.name, "es");
		})
		.map((node) => ({
			...node,
			children: sortProductSubcategoryTree(node.children),
		}));
}

function buildProductSubcategoryTree(
	subcategories: ProductSubcategoryRow[],
): ProductSubcategoryTreeNode[] {
	const nodes = new Map<string, ProductSubcategoryTreeNode>();

	for (const productSubcategory of subcategories) {
		nodes.set(productSubcategory.id, {
			...productSubcategory,
			children: [],
		});
	}

	const roots: ProductSubcategoryTreeNode[] = [];

	for (const node of nodes.values()) {
		if (
			node.parent_subcategory_id &&
			nodes.has(node.parent_subcategory_id)
		) {
			nodes.get(node.parent_subcategory_id)?.children.push(node);
		} else {
			roots.push(node);
		}
	}

	return sortProductSubcategoryTree(roots);
}

function appendSearchValue(values: string[], value: string | null | undefined) {
	if (value) {
		values.push(value);
	}
}

function buildProductCategorySearchText(
	productCategory: ProductCategoryRow,
	categoryLines: ProductLineRow[],
	categorySubcategories: ProductSubcategoryRow[],
) {
	const searchValues: string[] = [];

	appendSearchValue(searchValues, productCategory.name);
	appendSearchValue(searchValues, productCategory.description);

	for (const productLine of categoryLines) {
		appendSearchValue(searchValues, productLine.name);
		appendSearchValue(searchValues, productLine.description);
	}

	for (const productSubcategory of categorySubcategories) {
		appendSearchValue(searchValues, productSubcategory.name);
		appendSearchValue(searchValues, productSubcategory.description);
	}

	return searchValues.join(" ");
}

function ProductSubcategoryTree({
	productCategory,
	productLine,
	nodes,
	level = 0,
}: {
	productCategory: ProductCategoryRow;
	productLine: ProductLineRow;
	nodes: ProductSubcategoryTreeNode[];
	level?: number;
}) {
	return (
		<div className="space-y-3">
			{nodes.map((productSubcategory) => (
				<div
					key={productSubcategory.id}
					className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
					style={level > 0 ? { marginLeft: `${level * 18}px` } : undefined}
				>
					<div className="flex items-start gap-3">
						<div className="min-w-0 flex-1">
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div className="min-w-0">
									<div className="flex flex-wrap items-center gap-2">
										<Link
											href={buildAdminProductsHref({
												category: productCategory.name,
												productLine: productLine.name,
												subcategory: productSubcategory.name,
											})}
											className="text-sm font-semibold text-slate-800 transition hover:text-slate-950"
										>
											{productSubcategory.name}
										</Link>
										{productSubcategory.children.length > 0 ? (
											<span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
												{productSubcategory.children.length} hijas
											</span>
										) : null}
									</div>
								</div>

								<div className="flex flex-wrap gap-2">
									<Link
										href={`/admin/catalog/product-subcategories/${productSubcategory.id}/edit`}
										className="rounded-md bg-slate-100 px-2.5 py-1.5 text-[11px] font-medium text-slate-700 transition hover:bg-slate-200"
									>
										Editar
									</Link>
								</div>
							</div>

							{productSubcategory.children.length > 0 ? (
								<div className="mt-3 border-l border-slate-200 pl-3">
									<ProductSubcategoryTree
										productCategory={productCategory}
										productLine={productLine}
										nodes={productSubcategory.children}
										level={level + 1}
									/>
								</div>
							) : null}
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

function buildProductCategoryItems(
	productCategories: ProductCategoryRow[],
	productLines: ProductLineRow[],
	productSubcategories: ProductSubcategoryRow[],
): EntityTableItem[] {
	return productCategories.map((productCategory) => {
		const categoryLines = productLines.filter(
			(productLine) => productLine.product_category_id === productCategory.id,
		);
		const lineIds = new Set(categoryLines.map((productLine) => productLine.id));
		const categorySubcategories = productSubcategories.filter((productSubcategory) =>
			lineIds.has(productSubcategory.product_line_id),
		);

		return {
			id: productCategory.id,
			title: productCategory.name,
			subtitle: "",
			category: null,
			status: null,
			primaryDate: String(9999 - productCategory.display_order).padStart(4, "0"),
			badges: [],
			fields: [],
			searchText: buildProductCategorySearchText(
				productCategory,
				categoryLines,
				categorySubcategories,
			),
		};
	});
}

export default function CatalogHierarchyWorkspace({
	productCategories,
	productLines,
	productSubcategories,
	initialExpandedCategoryId = null,
	initialExpandedLineId = null,
}: Props) {
	const categoryBadgeClassMap = useMemo(
		() => buildCategoryBadgeClassMap(productCategories.map((category) => category.name)),
		[productCategories],
	);
	const items = useMemo(
		() =>
			buildProductCategoryItems(
				productCategories,
				productLines,
				productSubcategories,
			),
		[productCategories, productLines, productSubcategories],
	);
	const table = useEntityTable(items, {
		defaultSortField: "title",
		defaultSortDirection: "asc",
	});
	const lineCategoryById = useMemo(
		() =>
			new Map(
				productLines.map((productLine) => [
					productLine.id,
					productLine.product_category_id,
				]),
			),
		[productLines],
	);
	const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(
		initialExpandedCategoryId ??
			(initialExpandedLineId
				? (lineCategoryById.get(initialExpandedLineId) ?? null)
				: null),
	);
	const [expandedLineId, setExpandedLineId] = useState<string | null>(
		initialExpandedLineId,
	);
	const productCategoriesById = useMemo(
		() =>
			new Map(
				productCategories.map((productCategory) => [
					productCategory.id,
					productCategory,
				]),
			),
		[productCategories],
	);
	const filteredCategories = useMemo(() => {
		const nextCategories: ProductCategoryRow[] = [];

		for (const item of table.filteredAndSortedItems) {
			const productCategory = productCategoriesById.get(item.id);

			if (productCategory) {
				nextCategories.push(productCategory);
			}
		}

		return nextCategories;
	}, [productCategoriesById, table.filteredAndSortedItems]);
	const subcategoryTreesByLineId = useMemo(() => {
		const groupedSubcategories = productSubcategories.reduce<
			Map<string, ProductSubcategoryRow[]>
		>((acc, productSubcategory) => {
			const current = acc.get(productSubcategory.product_line_id) ?? [];
			current.push(productSubcategory);
			acc.set(productSubcategory.product_line_id, current);
			return acc;
		}, new Map<string, ProductSubcategoryRow[]>());

		return new Map(
			Array.from(groupedSubcategories.entries()).map(([productLineId, subcategories]) => [
				productLineId,
				buildProductSubcategoryTree(subcategories),
			]),
		);
	}, [productSubcategories]);

	function toggleCategory(categoryId: string) {
		setExpandedCategoryId((current) => (current === categoryId ? null : categoryId));
	}

	function toggleLine(categoryId: string, lineId: string) {
		setExpandedCategoryId(categoryId);
		setExpandedLineId((current) => (current === lineId ? null : lineId));
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-end gap-3">
				<div className="flex flex-wrap gap-2">
					<Link
						href="/admin/catalog/product-categories/new"
						className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
					>
						Nueva categoría
					</Link>
					<Link
						href="/admin/catalog/product-lines/new"
						className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
					>
						Nueva línea comercial
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
				categories={[]}
				statuses={[]}
				filteredCount={filteredCategories.length}
				totalCount={productCategories.length}
				resetFilters={table.resetFilters}
				config={{
					defaultSortField: "title",
					defaultSortDirection: "asc",
				}}
			/>

			<div className="space-y-4">
				{filteredCategories.length === 0 ? (
					<div className="rounded-2xl border border-slate-200 bg-white px-4 py-10 text-center text-slate-500 shadow-md">
						No hay categorías que coincidan con los filtros actuales.
					</div>
				) : null}

				{filteredCategories.map((productCategory) => {
					const categoryLines = productLines
						.filter(
							(productLine) =>
								productLine.product_category_id === productCategory.id,
						)
						.sort((left, right) => {
							if (left.display_order !== right.display_order) {
								return left.display_order - right.display_order;
							}

							return left.name.localeCompare(right.name, "es");
						});
					const isExpanded = expandedCategoryId === productCategory.id;

					return (
						<article
							key={productCategory.id}
							className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md"
						>
							<div className="flex flex-wrap items-start justify-between gap-4 p-5">
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<span
											className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getCategoryBadgeClass(
												productCategory.name,
												categoryBadgeClassMap,
											)}`}
										>
											{categoryLines.length === 1
												? "1 línea"
												: `${categoryLines.length} líneas`}
										</span>
									</div>

									<Link
										href={buildAdminProductsHref({
											category: productCategory.name,
										})}
										className="mt-3 inline-block text-2xl font-semibold tracking-tight text-slate-900 transition hover:text-slate-700"
									>
										{productCategory.name}
									</Link>
								</div>

								<div className="flex flex-wrap items-center gap-2">
									<Link
										href={`/admin/catalog/product-categories/${productCategory.id}/edit`}
										className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
									>
										Editar categoría
									</Link>
									<Link
										href={`/admin/catalog/product-lines/new?productCategoryId=${productCategory.id}`}
										className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
									>
										Nueva línea
									</Link>
									<button
										type="button"
										onClick={() => toggleCategory(productCategory.id)}
										aria-expanded={isExpanded}
										className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
									>
										{isExpanded ? "Ocultar líneas" : "Ver líneas"}
									</button>
								</div>
							</div>

							{isExpanded ? (
								<div className="border-t border-slate-200 bg-slate-50/60 p-4">
									{categoryLines.length === 0 ? (
										<div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
											Esta categoría todavía no tiene líneas comerciales asociadas.
										</div>
									) : (
										<div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
											{categoryLines.map((productLine) => {
												const lineSubcategories = productSubcategories.filter(
													(productSubcategory) =>
														productSubcategory.product_line_id ===
														productLine.id,
												);
												const isLineExpanded = expandedLineId === productLine.id;
												const subcategoryTree =
													subcategoryTreesByLineId.get(productLine.id) ?? [];

												return (
													<div
														key={productLine.id}
														className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
													>
														<div className="flex items-start gap-4 p-4">
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
																<div className="flex flex-wrap items-center gap-2">
																	<span
																		className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getCategoryBadgeClass(
																			productCategory.name,
																			categoryBadgeClassMap,
																		)}`}
																	>
																		{productCategory.name}
																	</span>
																	<span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
																		{lineSubcategories.length === 1
																			? "1 subcategoría"
																			: `${lineSubcategories.length} subcategorías`}
																	</span>
																</div>

																<Link
																	href={buildAdminProductsHref({
																		category: productCategory.name,
																		productLine: productLine.name,
																	})}
																	className="mt-3 inline-block text-xl font-semibold tracking-tight text-slate-900 transition hover:text-slate-700"
																>
																	{productLine.name}
																</Link>

																<div className="mt-4 flex flex-wrap gap-2">
																	<Link
																		href={`/admin/catalog/product-lines/${productLine.id}/edit`}
																		className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
																	>
																		Editar línea
																	</Link>
																	<Link
																		href={`/admin/catalog/product-subcategories/new?productLineId=${productLine.id}`}
																		className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
																	>
																		Nueva subcategoría
																	</Link>
																	{lineSubcategories.length > 0 ? (
																		<button
																			type="button"
																			onClick={() =>
																				toggleLine(
																					productCategory.id,
																					productLine.id,
																				)
																			}
																			aria-expanded={isLineExpanded}
																			className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
																		>
																			{isLineExpanded
																				? "Ocultar subcategorías"
																				: "Ver subcategorías"}
																		</button>
																	) : null}
																</div>
															</div>
														</div>

														{isLineExpanded && subcategoryTree.length > 0 ? (
															<div className="border-t border-slate-200 bg-slate-50/80 p-4">
																<ProductSubcategoryTree
																	productCategory={productCategory}
																	productLine={productLine}
																	nodes={subcategoryTree}
																/>
															</div>
														) : null}
													</div>
												);
											})}
										</div>
									)}
								</div>
							) : null}
						</article>
					);
				})}
			</div>
		</div>
	);
}
