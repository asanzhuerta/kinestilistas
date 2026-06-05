export type SerializableDate = Date | string | null | undefined;

export function toIsoString(value: SerializableDate) {
	if (!value) {
		return "";
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	const parsedDate = new Date(value);

	if (Number.isNaN(parsedDate.getTime())) {
		return value;
	}

	return parsedDate.toISOString();
}
