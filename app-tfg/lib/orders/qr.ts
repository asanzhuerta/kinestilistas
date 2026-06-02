const ORDER_QR_PREFIX = "kinestilistas-order";

export function buildOrderQrPayload(orderId: string) {
	return `${ORDER_QR_PREFIX}:${String(orderId).trim()}`;
}

export function buildOrderQrImageUrl(orderId: string) {
	const params = new URLSearchParams({
		text: buildOrderQrPayload(orderId),
		size: "220",
		margin: "1",
	});

	return `https://quickchart.io/qr?${params.toString()}`;
}

export function extractOrderIdFromQrValue(value: string | null | undefined) {
	const normalizedValue = String(value ?? "").trim();

	if (!normalizedValue) {
		return null;
	}

	if (
		/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
			normalizedValue,
		)
	) {
		return normalizedValue;
	}

	const prefix = `${ORDER_QR_PREFIX}:`;

	if (!normalizedValue.toLowerCase().startsWith(prefix)) {
		return null;
	}

	const orderId = normalizedValue.slice(prefix.length).trim();

	return orderId || null;
}

export function normalizeOrderQrValues(values: string[] | null | undefined) {
	const uniqueOrderIds = new Set<string>();

	for (const rawValue of Array.isArray(values) ? values : []) {
		const orderId = extractOrderIdFromQrValue(rawValue);

		if (orderId) {
			uniqueOrderIds.add(orderId);
		}
	}

	return Array.from(uniqueOrderIds);
}
