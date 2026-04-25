export function normalizeText(value: string | null | undefined) {
	return String(value ?? "").trim();
}

export function normalizeEmail(value: string | null | undefined) {
	return normalizeText(value).toLowerCase();
}

export function isValidEmail(value: string) {
	return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
