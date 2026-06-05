import { revalidateTag, unstable_cache } from "next/cache";

export const CATALOG_CACHE_TAG = "catalog";
export const CATALOG_CACHE_REVALIDATE_SECONDS = 300;

export function createCatalogDataCache<TArgs extends unknown[], TResult>(
	callback: (...args: TArgs) => Promise<TResult>,
	keyParts: string[],
) {
	return unstable_cache(callback, keyParts, {
		tags: [CATALOG_CACHE_TAG],
		revalidate: CATALOG_CACHE_REVALIDATE_SECONDS,
	}) as (...args: TArgs) => Promise<TResult>;
}

export function revalidateCatalogCache() {
	try {
		revalidateTag(CATALOG_CACHE_TAG, "max");
	} catch {
		// The catalog writes should not fail if a smoke script runs outside Next.
	}
}
