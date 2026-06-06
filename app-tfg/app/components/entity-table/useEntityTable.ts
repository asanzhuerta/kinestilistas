"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
	EntitySortDirection,
	EntitySortField,
	EntityTableConfig,
	EntityTableItem,
} from "./entity-table-types";

const ENTITY_TABLE_STORAGE_PREFIX = "kinestilistas:entity-table:";

type PersistedEntityTableState = {
	search?: unknown;
	categoryFilter?: unknown;
	statusFilter?: unknown;
	hasImageFilter?: unknown;
	hideInactiveItems?: unknown;
	sortField?: unknown;
	sortDirection?: unknown;
	extraFilterValues?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isEntitySortField(value: unknown): value is EntitySortField {
	return (
		value === "title" ||
		value === "subtitle" ||
		value === "category" ||
		value === "status" ||
		value === "primaryDate"
	);
}

function isEntitySortDirection(value: unknown): value is EntitySortDirection {
	return value === "asc" || value === "desc";
}

function readPersistedState(
	persistenceKey: string | undefined,
): PersistedEntityTableState | null {
	if (!persistenceKey || typeof window === "undefined") {
		return null;
	}

	try {
		const raw = window.sessionStorage.getItem(
			`${ENTITY_TABLE_STORAGE_PREFIX}${persistenceKey}`,
		);

		if (!raw) {
			return null;
		}

		const parsed = JSON.parse(raw);
		return isRecord(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

function persistState(
	persistenceKey: string | undefined,
	state: PersistedEntityTableState,
) {
	if (!persistenceKey || typeof window === "undefined") {
		return;
	}

	try {
		window.sessionStorage.setItem(
			`${ENTITY_TABLE_STORAGE_PREFIX}${persistenceKey}`,
			JSON.stringify(state),
		);
	} catch {
		// Si el almacenamiento del navegador no esta disponible, la tabla sigue funcionando.
	}
}

function getPersistedString(value: unknown, fallback: string) {
	return typeof value === "string" ? value : fallback;
}

function getPersistedExtraFilterValues(value: unknown) {
	if (!isRecord(value)) {
		return {};
	}

	return Object.fromEntries(
		Object.entries(value).filter(
			(entry): entry is [string, string] => typeof entry[1] === "string",
		),
	);
}

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

function buildExtraFilterInitialState(
	config?: EntityTableConfig,
	includeInitialValues = true,
) {
	const extraFilterInitialState = Object.fromEntries(
		(config?.extraFilters ?? []).map((filter) => [filter.key, "todos"]),
	) as Record<string, string>;

	if (includeInitialValues) {
		for (const [key, value] of Object.entries(
			config?.initialExtraFilterValues ?? {},
		)) {
			if (typeof value === "string" && value.trim() !== "") {
				extraFilterInitialState[key] = value;
			}
		}
	}

	return extraFilterInitialState;
}

function getDefaultSortField(config?: EntityTableConfig): EntitySortField {
	return config?.defaultSortField ?? "primaryDate";
}

function getDefaultSortDirection(
	config?: EntityTableConfig,
): EntitySortDirection {
	return config?.defaultSortDirection ?? "desc";
}

function resolveInitialFilterValue(value: string | undefined) {
	return typeof value === "string" && value.trim() !== "" ? value : "todos";
}

function matchesSelectedValue(
	item: EntityTableItem,
	filterKey: string,
	selectedValue: string,
) {
	if (selectedValue === "todos") {
		return true;
	}

	if (filterKey === "category") {
		return item.category === selectedValue;
	}

	if (filterKey === "status") {
		return item.status === selectedValue;
	}

	if (filterKey === "hasImage") {
		return (
			(selectedValue === "con_imagen" && Boolean(item.imageUrl)) ||
			(selectedValue === "sin_imagen" && !item.imageUrl)
		);
	}

	return (item.filterValues?.[filterKey] ?? null) === selectedValue;
}

function getAvailableExtraFilterOptions(input: {
	items: EntityTableItem[];
	filterKey: string;
	dependencyKeys: string[];
	categoryFilter: string;
	statusFilter: string;
	hasImageFilter: string;
	extraFilterValues: Record<string, string>;
}) {
	const scopedItems = input.items.filter((item) =>
		input.dependencyKeys.every((dependencyKey) => {
			if (dependencyKey === input.filterKey) {
				return true;
			}

			const selectedValue =
				dependencyKey === "category"
					? input.categoryFilter
					: dependencyKey === "status"
						? input.statusFilter
						: dependencyKey === "hasImage"
							? input.hasImageFilter
							: (input.extraFilterValues[dependencyKey] ?? "todos");

			return matchesSelectedValue(item, dependencyKey, selectedValue);
		}),
	);

	return [
		...new Set(
			scopedItems
				.map((item) => item.filterValues?.[input.filterKey])
				.filter(Boolean) as string[],
		),
	].sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

export function useEntityTable(
	items: EntityTableItem[],
	config?: EntityTableConfig,
) {
	const persistenceKey = config?.persistenceKey;
	const [search, setSearch] = useState(config?.initialSearch ?? "");
	const [categoryFilter, setCategoryFilter] = useState(
		resolveInitialFilterValue(config?.initialCategoryFilter),
	);
	const [statusFilter, setStatusFilter] = useState(
		resolveInitialFilterValue(config?.initialStatusFilter),
	);
	const [hasImageFilter, setHasImageFilter] = useState(
		resolveInitialFilterValue(config?.initialHasImageFilter),
	);
	const [hideInactiveItems, setHideInactiveItems] = useState(
		config?.defaultHideInactive ?? false,
	);
	const [sortField, setSortField] = useState<EntitySortField>(
		getDefaultSortField(config),
	);
	const [sortDirection, setSortDirection] = useState<EntitySortDirection>(
		getDefaultSortDirection(config),
	);
	const [extraFilterValues, setExtraFilterValues] = useState<
		Record<string, string>
	>(() => buildExtraFilterInitialState(config, true));
	const [hasLoadedPersistedState, setHasLoadedPersistedState] = useState(
		!persistenceKey,
	);
	const restoredPersistenceKeyRef = useRef<string | undefined>(undefined);

	useEffect(() => {
		if (!persistenceKey || restoredPersistenceKeyRef.current === persistenceKey) {
			return;
		}

		restoredPersistenceKeyRef.current = persistenceKey;

		const restoreTimeout = window.setTimeout(() => {
			const persistedState = readPersistedState(persistenceKey);

			if (persistedState) {
				setSearch(getPersistedString(persistedState.search, ""));
				setCategoryFilter(
					resolveInitialFilterValue(
						getPersistedString(persistedState.categoryFilter, "todos"),
					),
				);
				setStatusFilter(
					resolveInitialFilterValue(
						getPersistedString(persistedState.statusFilter, "todos"),
					),
				);
				setHasImageFilter(
					resolveInitialFilterValue(
						getPersistedString(persistedState.hasImageFilter, "todos"),
					),
				);
				setHideInactiveItems(
					typeof persistedState.hideInactiveItems === "boolean"
						? persistedState.hideInactiveItems
						: (config?.defaultHideInactive ?? false),
				);
				setSortField(
					isEntitySortField(persistedState.sortField)
						? persistedState.sortField
						: getDefaultSortField(config),
				);
				setSortDirection(
					isEntitySortDirection(persistedState.sortDirection)
						? persistedState.sortDirection
						: getDefaultSortDirection(config),
				);
				setExtraFilterValues({
					...buildExtraFilterInitialState(config, true),
					...getPersistedExtraFilterValues(persistedState.extraFilterValues),
				});
			}

			setHasLoadedPersistedState(true);
		}, 0);

		return () => window.clearTimeout(restoreTimeout);
	}, [config, persistenceKey]);

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

	const resolvedCategoryFilter =
		categoryFilter !== "todos" && !categories.includes(categoryFilter)
			? "todos"
			: categoryFilter;
	const resolvedStatusFilter =
		statusFilter !== "todos" && !statuses.includes(statusFilter)
			? "todos"
			: statusFilter;

	const { resolvedExtraFilterValues, extraFilterOptions } = useMemo(() => {
		const nextExtraFilterValues = { ...extraFilterValues };
		const nextExtraFilterOptions: Record<string, string[]> = {};

		for (const filter of config?.extraFilters ?? []) {
			const options = getAvailableExtraFilterOptions({
				items,
				filterKey: filter.key,
				dependencyKeys: filter.dependsOn ?? [],
				categoryFilter: resolvedCategoryFilter,
				statusFilter: resolvedStatusFilter,
				hasImageFilter,
				extraFilterValues: nextExtraFilterValues,
			});

			nextExtraFilterOptions[filter.key] = options;

			const selectedValue = nextExtraFilterValues[filter.key] ?? "todos";

			if (selectedValue !== "todos" && !options.includes(selectedValue)) {
				nextExtraFilterValues[filter.key] = "todos";
			}
		}

		return {
			resolvedExtraFilterValues: nextExtraFilterValues,
			extraFilterOptions: nextExtraFilterOptions,
		};
	}, [
		items,
		config?.extraFilters,
		resolvedCategoryFilter,
		resolvedStatusFilter,
		hasImageFilter,
		extraFilterValues,
	]);

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
				resolvedCategoryFilter === "todos" ||
				item.category === resolvedCategoryFilter;

			const matchesStatus =
				resolvedStatusFilter === "todos" ||
				item.status === resolvedStatusFilter;

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
					const selectedValue =
						resolvedExtraFilterValues[filter.key] ?? "todos";
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
		resolvedCategoryFilter,
		resolvedStatusFilter,
		hasImageFilter,
		hideInactiveItems,
		resolvedExtraFilterValues,
		sortField,
		sortDirection,
		config?.extraFilters,
		config?.showImageFilter,
		config?.showHideInactiveToggle,
	]);

	useEffect(() => {
		if (!hasLoadedPersistedState) {
			return;
		}

		persistState(persistenceKey, {
			search,
			categoryFilter: resolvedCategoryFilter,
			statusFilter: resolvedStatusFilter,
			hasImageFilter,
			hideInactiveItems,
			sortField,
			sortDirection,
			extraFilterValues: resolvedExtraFilterValues,
		});
	}, [
		hasLoadedPersistedState,
		persistenceKey,
		search,
		resolvedCategoryFilter,
		resolvedStatusFilter,
		hasImageFilter,
		hideInactiveItems,
		sortField,
		sortDirection,
		resolvedExtraFilterValues,
	]);

	function resetFilters() {
		setSearch("");
		setCategoryFilter("todos");
		setStatusFilter("todos");
		setHasImageFilter("todos");
		setHideInactiveItems(config?.defaultHideInactive ?? false);
		setExtraFilterValues(buildExtraFilterInitialState(config, false));
		setSortField(getDefaultSortField(config));
		setSortDirection(getDefaultSortDirection(config));
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
		categoryFilter: resolvedCategoryFilter,
		setCategoryFilter,
		statusFilter: resolvedStatusFilter,
		setStatusFilter,
		hasImageFilter,
		setHasImageFilter,
		hideInactiveItems,
		setHideInactiveItems,
		extraFilterValues: resolvedExtraFilterValues,
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
