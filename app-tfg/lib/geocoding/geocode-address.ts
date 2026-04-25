// -----------------------------------------------------------------------------
// GEOCODIFICACION DE DIRECCIONES
// -----------------------------------------------------------------------------
// Helper desacoplado para convertir direcciones textuales en coordenadas.
// Mantiene una estrategia de busqueda progresiva para tolerar:
// - abreviaturas de vias
// - codigos postales restrictivos
// - numeros de portal no reconocidos por el proveedor
// - necesidad de pasar de busqueda estructurada a libre
// -----------------------------------------------------------------------------
import { normalizeText } from "@/lib/utils/text";

export type GeocodeAddressInput = {
	address?: string | null;
	city?: string | null;
	postalCode?: string | null;
	province?: string | null;
	country?: string | null;
};

export type GeocodeFreeTextInput = {
	query?: string | null;
	country?: string | null;
};

export type GeocodeAddressResult = {
	lat: string;
	lng: string;
	displayName: string | null;
};

type NominatimSearchResult = {
	lat?: string;
	lon?: string;
	display_name?: string;
};

type GeocodingConfig = {
	baseUrl: string;
	countryCode: string;
	countryName: string;
	contactEmail: string;
	userAgent: string;
	resolvedCountry: string;
};

export class GeocodingError extends Error {
	status: number;
	code: string;
	retryable: boolean;

	constructor(
		message: string,
		status = 500,
		code = "GEOCODING_ERROR",
		retryable = false,
	) {
		super(message);
		this.name = "GeocodingError";
		this.status = status;
		this.code = code;
		this.retryable = retryable;
	}
}

function isGeocodingDebugEnabled() {
	return normalizeText(process.env.GEOCODING_DEBUG).toLowerCase() === "true";
}

function redactDebugUrl(url: string) {
	const parsedUrl = new URL(url);

	if (parsedUrl.searchParams.has("email")) {
		parsedUrl.searchParams.set("email", "[redacted]");
	}

	return parsedUrl.toString();
}

function logGeocodingDebug(message: string, data?: unknown) {
	if (!isGeocodingDebugEnabled()) {
		return;
	}

	if (data === undefined) {
		console.log(`[geocoding] ${message}`);
		return;
	}

	console.log(`[geocoding] ${message}`, data);
}

function uniqueValues(values: string[]) {
	return Array.from(new Set(values.map(normalizeText).filter(Boolean)));
}

function expandSpanishStreetAbbreviations(query: string) {
	return query
		.replace(/\bC\.\s*/gi, "Calle ")
		.replace(/\bAvda\.\s*/gi, "Avenida ")
		.replace(/\bAv\.\s*/gi, "Avenida ")
		.replace(/\bPza\.\s*/gi, "Plaza ");
}

function stripTrailingStreetNumber(address: string) {
	return address.replace(/\s+\d+[A-Za-zºª/-]*\s*$/, "").trim();
}

function buildAddressVariants(address: string) {
	const normalized = normalizeText(address);
	const withoutStreetNumber = stripTrailingStreetNumber(normalized);
	const expanded = expandSpanishStreetAbbreviations(normalized);
	const expandedWithoutStreetNumber =
		expandSpanishStreetAbbreviations(withoutStreetNumber);

	return uniqueValues([
		normalized,
		expanded,
		withoutStreetNumber,
		expandedWithoutStreetNumber,
	]);
}

function buildFreeTextSearchQueries(query: string) {
	const withoutPostalCode = query
		.replace(/\b\d{5}\b/g, "")
		.replace(/\s{2,}/g, " ")
		.trim();
	const expandedAbbreviations = expandSpanishStreetAbbreviations(query);
	const expandedWithoutPostalCode =
		expandSpanishStreetAbbreviations(withoutPostalCode);

	return uniqueValues([
		query,
		expandedAbbreviations,
		withoutPostalCode,
		expandedWithoutPostalCode,
	]);
}

function normalizeNominatimResults(data: unknown) {
	if (!Array.isArray(data)) {
		return [];
	}

	return data.filter(
		(item): item is NominatimSearchResult =>
			typeof item === "object" && item !== null,
	);
}

function mapFirstNominatimResult(data: NominatimSearchResult[] | null) {
	if (!data || data.length === 0) {
		return null;
	}

	const first = data[0];
	const lat = normalizeText(first.lat);
	const lng = normalizeText(first.lon);

	if (!lat || !lng) {
		return null;
	}

	return {
		lat,
		lng,
		displayName: normalizeText(first.display_name) || null,
	} satisfies GeocodeAddressResult;
}

function getGeocodingConfig(input: { country?: string | null }): GeocodingConfig {
	const provider = normalizeText(process.env.GEOCODING_PROVIDER).toLowerCase();

	if (provider && provider !== "nominatim") {
		throw new GeocodingError(
			"Proveedor de geocodificacion no soportado",
			400,
			"UNSUPPORTED_GEOCODING_PROVIDER",
		);
	}

	const countryName =
		normalizeText(process.env.GEOCODING_COUNTRY_NAME) || "Espana";

	return {
		baseUrl:
			normalizeText(process.env.GEOCODING_BASE_URL) ||
			"https://nominatim.openstreetmap.org",
		countryCode:
			normalizeText(process.env.GEOCODING_COUNTRY_CODE).toLowerCase() || "es",
		countryName,
		contactEmail: normalizeText(process.env.GEOCODING_EMAIL) || "",
		userAgent:
			normalizeText(process.env.GEOCODING_USER_AGENT) || "KinestilistasTFG/1.0",
		resolvedCountry: normalizeText(input.country) || countryName,
	};
}

async function fetchNominatimSearch(
	url: string,
	userAgent: string,
): Promise<NominatimSearchResult[] | null> {
	logGeocodingDebug("request", {
		url: redactDebugUrl(url),
		userAgent,
	});

	const response = await fetch(url, {
		method: "GET",
		headers: {
			Accept: "application/json",
			"User-Agent": userAgent,
		},
		cache: "no-store",
	});

	const rawText = await response.text();

	if (!response.ok) {
		logGeocodingDebug("response error", {
			status: response.status,
			statusText: response.statusText,
			bodyPreview: rawText.slice(0, 300),
		});

		if (response.status === 429) {
			throw new GeocodingError(
				"El servicio de geocodificacion ha bloqueado temporalmente las peticiones por exceso de uso.",
				429,
				"GEOCODING_RATE_LIMIT",
				true,
			);
		}

		if (response.status >= 500) {
			throw new GeocodingError(
				"El servicio de geocodificacion no esta disponible temporalmente.",
				response.status,
				"GEOCODING_PROVIDER_UNAVAILABLE",
				true,
			);
		}

		throw new GeocodingError(
			`No se pudo geocodificar la direccion. HTTP ${response.status} ${response.statusText}`,
			response.status,
			"GEOCODING_HTTP_ERROR",
		);
	}

	let parsedData: unknown = null;

	try {
		parsedData = JSON.parse(rawText) as unknown;
	} catch (error) {
		logGeocodingDebug("invalid json", {
			error,
			bodyPreview: rawText.slice(0, 300),
		});
		throw new GeocodingError(
			"Respuesta invalida del servicio de geocodificacion",
			502,
			"INVALID_GEOCODING_RESPONSE",
			true,
		);
	}

	const results = normalizeNominatimResults(parsedData);

	logGeocodingDebug("response", {
		resultCount: results.length,
		firstResult: results[0]?.display_name ?? null,
	});

	return results.length > 0 ? results : null;
}

function buildNominatimSearchUrl(baseUrl: string, params: URLSearchParams) {
	return `${baseUrl}/search?${params.toString()}`;
}

async function tryStructuredSearch(
	input: GeocodeAddressInput,
	config: GeocodingConfig,
	addressVariant: string,
	includePostalCode: boolean,
) {
	const params = new URLSearchParams({
		format: "jsonv2",
		limit: "1",
		addressdetails: "1",
		street: addressVariant,
		city: normalizeText(input.city),
		state: normalizeText(input.province),
		country: config.resolvedCountry,
		countrycodes: config.countryCode,
	});

	const postalCode = normalizeText(input.postalCode);

	if (includePostalCode && postalCode) {
		params.set("postalcode", postalCode);
	}

	if (config.contactEmail) {
		params.set("email", config.contactEmail);
	}

	const data = await fetchNominatimSearch(
		buildNominatimSearchUrl(config.baseUrl, params),
		config.userAgent,
	);

	return mapFirstNominatimResult(data);
}

async function tryFreeTextSearch(
	input: GeocodeAddressInput,
	config: GeocodingConfig,
	addressVariant: string,
	includePostalCode: boolean,
) {
	const q = [
		addressVariant,
		normalizeText(input.city),
		includePostalCode ? normalizeText(input.postalCode) : "",
		normalizeText(input.province),
		config.resolvedCountry,
	]
		.filter(Boolean)
		.join(", ");

	const params = new URLSearchParams({
		format: "jsonv2",
		limit: "1",
		addressdetails: "1",
		q,
		countrycodes: config.countryCode,
	});

	if (config.contactEmail) {
		params.set("email", config.contactEmail);
	}

	const data = await fetchNominatimSearch(
		buildNominatimSearchUrl(config.baseUrl, params),
		config.userAgent,
	);

	return mapFirstNominatimResult(data);
}

export function hasEnoughAddressToGeocode(input: GeocodeAddressInput) {
	const address = normalizeText(input.address);
	const city = normalizeText(input.city);

	return Boolean(address && city);
}

export function buildFullAddressLabel(input: GeocodeAddressInput) {
	return [
		normalizeText(input.address),
		normalizeText(input.city),
		normalizeText(input.postalCode),
		normalizeText(input.province),
		normalizeText(input.country),
	]
		.filter(Boolean)
		.join(", ");
}

export async function geocodeAddress(
	input: GeocodeAddressInput,
): Promise<GeocodeAddressResult | null> {
	logGeocodingDebug("input", input);

	if (!hasEnoughAddressToGeocode(input)) {
		logGeocodingDebug("insufficient address", input);
		return null;
	}

	const config = getGeocodingConfig(input);
	const addressVariants = buildAddressVariants(normalizeText(input.address));

	logGeocodingDebug("config", {
		baseUrl: config.baseUrl,
		countryCode: config.countryCode,
		countryName: config.countryName,
		userAgent: config.userAgent,
		hasContactEmail: Boolean(config.contactEmail),
		resolvedCountry: config.resolvedCountry,
	});
	logGeocodingDebug("address variants", addressVariants);

	for (const addressVariant of addressVariants) {
		logGeocodingDebug("trying variant", addressVariant);

		const structuredWithPostal = await tryStructuredSearch(
			input,
			config,
			addressVariant,
			true,
		);

		if (structuredWithPostal) {
			logGeocodingDebug("matched structured with postal", structuredWithPostal);
			return structuredWithPostal;
		}

		const structuredWithoutPostal = await tryStructuredSearch(
			input,
			config,
			addressVariant,
			false,
		);

		if (structuredWithoutPostal) {
			logGeocodingDebug(
				"matched structured without postal",
				structuredWithoutPostal,
			);
			return structuredWithoutPostal;
		}

		const freeTextWithPostal = await tryFreeTextSearch(
			input,
			config,
			addressVariant,
			true,
		);

		if (freeTextWithPostal) {
			logGeocodingDebug("matched free text with postal", freeTextWithPostal);
			return freeTextWithPostal;
		}

		const freeTextWithoutPostal = await tryFreeTextSearch(
			input,
			config,
			addressVariant,
			false,
		);

		if (freeTextWithoutPostal) {
			logGeocodingDebug(
				"matched free text without postal",
				freeTextWithoutPostal,
			);
			return freeTextWithoutPostal;
		}
	}

	logGeocodingDebug("no valid match", input);
	return null;
}

export async function geocodeFreeTextAddress(
	input: GeocodeFreeTextInput,
): Promise<GeocodeAddressResult | null> {
	const query = normalizeText(input.query);

	if (!query) {
		return null;
	}

	const config = getGeocodingConfig({ country: input.country });
	const searches = buildFreeTextSearchQueries(query);

	for (const searchQuery of searches) {
		logGeocodingDebug("free text attempt", { query: searchQuery });

		const params = new URLSearchParams({
			format: "jsonv2",
			limit: "1",
			addressdetails: "1",
			q: searchQuery,
			countrycodes: config.countryCode,
		});

		if (config.contactEmail) {
			params.set("email", config.contactEmail);
		}

		const data = await fetchNominatimSearch(
			buildNominatimSearchUrl(config.baseUrl, params),
			config.userAgent,
		);
		const result = mapFirstNominatimResult(data);

		if (result) {
			logGeocodingDebug("free text matched", {
				query: searchQuery,
				displayName: result.displayName,
				lat: result.lat,
				lng: result.lng,
			});
			return result;
		}
	}

	logGeocodingDebug("free text no match", { query });
	return null;
}
