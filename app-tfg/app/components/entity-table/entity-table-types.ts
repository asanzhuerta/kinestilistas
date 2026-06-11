// Tipos visuales reutilizables para representar elementos dentro
// de la tabla/listado genérico de entidades.

export type EntityTableBadge = {
	label: string;
	className?: string;
};

export type EntityTableAction = {
	label: string;
	href: string;
	variant?: "primary" | "secondary" | "warning";
};

export type EntityTableField = {
	label: string;
	value: string;
	mobileHidden?: boolean;
};

export type EntityTableExtraFilter = {
	key: string;
	label: string;
	allLabel?: string;
	dependsOn?: string[];
};

export type EntityTableCardVariant =
	| "default"
	| "headline"
	| "media"
	| "catalog-product"
	| "color-reference"
	| "compact-visit";

export type EntitySortField =
	| "title"
	| "subtitle"
	| "category"
	| "status"
	| "primaryDate";

export type EntitySortDirection = "asc" | "desc";

export type EntityTableItem = {
	id: string;
	title: string;
	subtitle: string;
	href?: string | null;
	imageUrl?: string | null;
	secondaryImageUrl?: string | null;
	secondaryImageLabel?: string | null;
	secondaryBadge?: EntityTableBadge | null;
	category?: string | null;
	status?: string | null;
	primaryDate?: string | null;
	secondaryDate?: string | null;
	badges?: EntityTableBadge[];
	fields: EntityTableField[];
	actions?: EntityTableAction[];
	searchText?: string;
	filterValues?: Record<string, string | null | undefined>;
};

export type EntityTableConfig = {
	categoryLabel?: string;
	statusLabel?: string;
	primaryDateLabel?: string;
	showImageFilter?: boolean;
	showHideInactiveToggle?: boolean;
	hideInactiveLabel?: string;
	defaultHideInactive?: boolean;
	defaultSortField?: EntitySortField;
	defaultSortDirection?: EntitySortDirection;
	emptyMessage?: string;
	extraFilters?: EntityTableExtraFilter[];
	cardVariant?: EntityTableCardVariant;
	gridClassName?: string;
	initialSearch?: string;
	initialCategoryFilter?: string;
	initialStatusFilter?: string;
	initialHasImageFilter?: string;
	initialExtraFilterValues?: Record<string, string>;
	persistenceKey?: string;
};
