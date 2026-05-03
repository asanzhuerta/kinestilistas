type SearchParamValue = string | string[] | undefined;

function appendFilter(
	params: URLSearchParams,
	key: string,
	value: string | null | undefined,
) {
	if (typeof value === "string" && value.trim() !== "") {
		params.set(key, value);
	}
}

function buildAdminCatalogHref(
	basePath: string,
	filters: Record<string, string | null | undefined>,
) {
	const params = new URLSearchParams();

	for (const [key, value] of Object.entries(filters)) {
		appendFilter(params, key, value);
	}

	const query = params.toString();
	return query ? `${basePath}?${query}` : basePath;
}

export function buildAdminProductsHref(filters: {
	category?: string | null;
	productLine?: string | null;
	subcategory?: string | null;
}) {
	return buildAdminCatalogHref("/admin/catalog/products", filters);
}

export function buildAdminColorReferencesHref(filters: {
	category?: string | null;
	colorChart?: string | null;
}) {
	return buildAdminCatalogHref("/admin/catalog/color-references", filters);
}

export function getSingleSearchParamValue(value: SearchParamValue) {
	if (Array.isArray(value)) {
		return value[0] ?? undefined;
	}

	return value;
}
