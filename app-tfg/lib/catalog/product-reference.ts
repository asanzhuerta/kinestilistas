const PENDING_REFERENCE_PREFIX = "PENDING-CODE-";

export function isSyntheticProductReference(reference: string | null | undefined) {
	return String(reference ?? "")
		.trim()
		.toUpperCase()
		.startsWith(PENDING_REFERENCE_PREFIX);
}

export function getVisibleProductReference(
	reference: string | null | undefined,
) {
	return isSyntheticProductReference(reference) ? null : String(reference ?? "").trim();
}

export { PENDING_REFERENCE_PREFIX };
