export const MADRID_TIME_ZONE = "Europe/Madrid";

const madridDatePartFormatter = new Intl.DateTimeFormat("en-CA", {
	timeZone: MADRID_TIME_ZONE,
	year: "numeric",
	month: "2-digit",
	day: "2-digit",
});

export function parseTimeToMinutes(value: string | null | undefined) {
	const normalized = String(value ?? "").trim();

	if (!normalized) {
		return null;
	}

	const match = normalized.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);

	if (!match) {
		return null;
	}

	const hours = Number(match[1]);
	const minutes = Number(match[2]);

	if (
		!Number.isInteger(hours) ||
		!Number.isInteger(minutes) ||
		hours < 0 ||
		hours > 23 ||
		minutes < 0 ||
		minutes > 59
	) {
		return null;
	}

	return hours * 60 + minutes;
}

export function normalizeTimeForInput(value: string | null | undefined) {
	if (!value) {
		return "";
	}

	return value.slice(0, 5);
}

export function formatTimeLabel(
	value: string | null | undefined,
	fallback = "--:--",
) {
	if (!value) {
		return fallback;
	}

	return value.slice(0, 5);
}

export function getDatePartsInMadrid(date = new Date()) {
	const parts = madridDatePartFormatter.formatToParts(date);

	return {
		year: parts.find((part) => part.type === "year")?.value ?? "1970",
		month: parts.find((part) => part.type === "month")?.value ?? "01",
		day: parts.find((part) => part.type === "day")?.value ?? "01",
	};
}

export function getTodayDateInMadrid(date = new Date()) {
	const { year, month, day } = getDatePartsInMadrid(date);

	return `${year}-${month}-${day}`;
}
