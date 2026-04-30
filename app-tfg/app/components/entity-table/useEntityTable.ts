"use client";

import { useMemo, useState } from "react";
import type {
	EntitySortDirection,
	EntitySortField,
	EntityTableConfig,
	EntityTableItem,
} from "./entity-table-types";

function normalizeValue(value: unknown) {
	return String(value ?? "")
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();
}

function compareValues(a: unknown, b: unknown) {
	const aValue = normalizeValue(a);
	const bValue = normalizeValue(b);

	if (aValue < bValue) return -1;
	if (aValue > bValue) return 1;
	return 0;
}

function buildExtraFilterInitialState(config?: EntityTableConfig) {
	return Object.fromEntries(
		(config?.extraFilters ?? []).map((filter) => [filter.key, "todos"]),
	) as Record<string, string>;
}

export function useEntityTable(
	items: EntityTableItem[],
	config?: EntityTableConfig,
) {
	const [search, setSearch] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("todos");
	const [statusFilter, setStatusFilter] = useState("todos");
	const [hasImageFilter, setHasImageFilter] = useState("todos");
	const [hideInactiveItems, setHideInactiveItems] = useState(
		config?.defaultHideInactive ?? false,
	);
	const [sortField, setSortField] = useState<EntitySortField>("primaryDate");
	const [sortDirection, setSortDirection] =
		useState<EntitySortDirection>("desc");
	const [extraFilterValues, setExtraFilterValues] = useState<
		Record<string, string>
	>(() => buildExtraFilterInitialState(config));

	const categories = useMemo(
		() =>
			[
				...new Set(
					items.map((item) => item.category).filter(Boolean) as string[],
				),
			].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
		[items],
	);

	const statuses = useMemo(
		() =>
			[
				...new Set(
					items.map((item) => item.status).filter(Boolean) as string[],
				),
			].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" })),
		[items],
	);

	const extraFilterOptions = useMemo(() => {
		return Object.fromEntries(
			(config?.extraFilters ?? []).map((filter) => {
				const options = [
					...new Set(
						items
							.map((item) => item.filterValues?.[filter.key])
							.filter(Boolean) as string[],
					),
				].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

				return [filter.key, options];
			}),
		) as Record<string, string[]>;
	}, [items, config?.extraFilters]);

	const filteredAndSortedItems = useMemo(() => {
		const searchTerm = normalizeValue(search.trim());

		const filtered = items.filter((item) => {
			const haystack = normalizeValue(
				item.searchText ??
					[
						item.title,
						item.subtitle,
						item.category,
						item.status,
						item.primaryDate,
						item.secondaryDate,
						...item.fields.map((field) => field.value),
					].join(" "),
			);

			const matchesSearch = searchTerm === "" || haystack.includes(searchTerm);

			const matchesCategory =
				categoryFilter === "todos" || item.category === categoryFilter;

			const matchesStatus =
				statusFilter === "todos" || item.status === statusFilter;

			const matchesImage =
				!config?.showImageFilter ||
				hasImageFilter === "todos" ||
				(hasImageFilter === "con_imagen" && Boolean(item.imageUrl)) ||
				(hasImageFilter === "sin_imagen" && !item.imageUrl);

			const matchesHideInactive =
				!config?.showHideInactiveToggle ||
				!hideInactiveItems ||
				item.status?.toLowerCase() !== "inactive";

			const matchesExtraFilters = (config?.extraFilters ?? []).every(
				(filter) => {
					const selectedValue = extraFilterValues[filter.key] ?? "todos";
					const itemValue = item.filterValues?.[filter.key] ?? null;

					return selectedValue === "todos" || itemValue === selectedValue;
				},
			);

			return (
				matchesSearch &&
				matchesCategory &&
				matchesStatus &&
				matchesImage &&
				matchesHideInactive &&
				matchesExtraFilters
			);
		});

		return filtered.toSorted((a, b) => {
			const valueA = a[sortField];
			const valueB = b[sortField];
			const result = compareValues(valueA, valueB);
			return sortDirection === "asc" ? result : -result;
		});
	}, [
		items,
		search,
		categoryFilter,
		statusFilter,
		hasImageFilter,
		hideInactiveItems,
		extraFilterValues,
		sortField,
		sortDirection,
		config?.extraFilters,
		config?.showImageFilter,
		config?.showHideInactiveToggle,
	]);

	function resetFilters() {
		setSearch("");
		setCategoryFilter("todos");
		setStatusFilter("todos");
		setHasImageFilter("todos");
		setHideInactiveItems(config?.defaultHideInactive ?? false);
		setExtraFilterValues(buildExtraFilterInitialState(config));
		setSortField("primaryDate");
		setSortDirection("desc");
	}

	function setExtraFilterValue(key: string, value: string) {
		setExtraFilterValues((current) => ({
			...current,
			[key]: value,
		}));
	}

	return {
		search,
		setSearch,
		categoryFilter,
		setCategoryFilter,
		statusFilter,
		setStatusFilter,
		hasImageFilter,
		setHasImageFilter,
		hideInactiveItems,
		setHideInactiveItems,
		extraFilterValues,
		setExtraFilterValue,
		extraFilterOptions,
		sortField,
		setSortField,
		sortDirection,
		setSortDirection,
		categories,
		statuses,
		filteredAndSortedItems,
		resetFilters,
	};
}
