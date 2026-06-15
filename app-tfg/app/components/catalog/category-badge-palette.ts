const CATEGORY_BADGE_PALETTE = [
	"bg-sky-100 text-sky-700 border border-sky-200",
	"bg-violet-100 text-violet-700 border border-violet-200",
	"bg-amber-100 text-amber-700 border border-amber-200",
	"bg-emerald-100 text-emerald-700 border border-emerald-200",
	"bg-rose-100 text-rose-700 border border-rose-200",
	"bg-indigo-100 text-indigo-700 border border-indigo-200",
	"bg-cyan-100 text-cyan-700 border border-cyan-200",
	"bg-lime-100 text-lime-700 border border-lime-200",
] as const;

const DEFAULT_CATEGORY_BADGE_CLASS =
	"bg-slate-100 text-slate-700 border border-slate-200";

function normalizeCategoryKey(value: string | null | undefined) {
	return String(value ?? "")
		.trim()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();
}

export function buildCategoryBadgeClassMap(
	categoryNames: Array<string | null | undefined>,
) {
	const uniqueCategoryKeySet = new Set<string>();

	for (const categoryName of categoryNames) {
		const categoryKey = normalizeCategoryKey(categoryName);

		if (categoryKey) {
			uniqueCategoryKeySet.add(categoryKey);
		}
	}

	const uniqueCategoryKeys = Array.from(uniqueCategoryKeySet).toSorted((left, right) =>
		left.localeCompare(right, "es", { sensitivity: "base" }),
	);

	return new Map(
		uniqueCategoryKeys.map((categoryKey, index) => [
			categoryKey,
			CATEGORY_BADGE_PALETTE[index % CATEGORY_BADGE_PALETTE.length],
		]),
	);
}

export function getCategoryBadgeClass(
	categoryName: string | null | undefined,
	categoryBadgeClassMap: Map<string, string>,
) {
	const categoryKey = normalizeCategoryKey(categoryName);

	if (!categoryKey) {
		return DEFAULT_CATEGORY_BADGE_CLASS;
	}

	return categoryBadgeClassMap.get(categoryKey) ?? DEFAULT_CATEGORY_BADGE_CLASS;
}
