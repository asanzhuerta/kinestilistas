// -----------------------------------------------------------------------------
// GEOCODIFICACIÓN DE DIRECCIONES
// -----------------------------------------------------------------------------
// Este helper convierte una dirección textual en coordenadas lat/lng.
//
// Diseño:
// - desacoplado del servicio de clientes
// - preparado para cambiar de proveedor más adelante
// - pensado para ejecutarse desde backend al crear/editar clientes
//
// Mejora introducida:
// - antes solo se intentaba una búsqueda estructurada muy estricta
// - ahora aplicamos varios fallbacks progresivos para tolerar:
//   * calles escritas con tipo de vía distinto (Calle vs Camino)
//   * códigos postales dudosos o demasiado restrictivos
//   * números de portal que no existan en OpenStreetMap
//   * registros que necesiten búsqueda libre en vez de estructurada
// -----------------------------------------------------------------------------

export type GeocodeAddressInput = {
	address?: string | null;
	city?: string | null;
	postalCode?: string | null;
	province?: string | null;
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

function normalizeText(value: string | null | undefined) {
	return String(value ?? "").trim();
}

// Comprueba si hay suficiente información mínima para lanzar una geocodificación.
// No exigimos todos los campos, pero sí al menos dirección y ciudad.
export function hasEnoughAddressToGeocode(input: GeocodeAddressInput) {
	const address = normalizeText(input.address);
	const city = normalizeText(input.city);

	return !!address && !!city;
}

// Construye una dirección humana legible por si más adelante quieres loguearla.
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

// Quita el número final del portal para poder lanzar una búsqueda algo más laxa.
// Ejemplo: "Calle del Agua 43" -> "Calle del Agua"
function stripTrailingStreetNumber(address: string) {
	return address.replace(/\s+\d+[A-Za-zºª/-]*\s*$/, "").trim();
}

// Construye el bloque común de configuración del proveedor.
function getGeocodingConfig(input: GeocodeAddressInput) {
	const provider = normalizeText(process.env.GEOCODING_PROVIDER).toLowerCase();

	if (provider && provider !== "nominatim") {
		throw new Error("Proveedor de geocodificación no soportado");
	}

	return {
		baseUrl:
			normalizeText(process.env.GEOCODING_BASE_URL) ||
			"https://nominatim.openstreetmap.org",
		countryCode:
			normalizeText(process.env.GEOCODING_COUNTRY_CODE).toLowerCase() || "es",
		countryName: normalizeText(process.env.GEOCODING_COUNTRY_NAME) || "España",
		contactEmail: normalizeText(process.env.GEOCODING_EMAIL) || "",
		userAgent:
			normalizeText(process.env.GEOCODING_USER_AGENT) || "KinestilistasTFG/1.0",
		resolvedCountry: normalizeText(input.country),
	};
}

async function fetchNominatimSearch(
	url: string,
	userAgent: string,
): Promise<NominatimSearchResult[] | null> {
	const response = await fetch(url, {
		method: "GET",
		headers: {
			Accept: "application/json",
			"User-Agent": userAgent,
		},
		cache: "no-store",
	});

	if (!response.ok) {
		throw new Error("No se pudo geocodificar la dirección");
	}

	const data = (await response.json()) as NominatimSearchResult[];

	if (!Array.isArray(data) || data.length === 0) {
		return null;
	}

	return data;
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

async function tryStructuredSearch(
	input: GeocodeAddressInput,
	options?: {
		addressOverride?: string;
		includePostalCode?: boolean;
	},
) {
	const config = getGeocodingConfig(input);

	const params = new URLSearchParams({
		format: "jsonv2",
		limit: "1",
		addressdetails: "1",
		street: normalizeText(options?.addressOverride ?? input.address),
		city: normalizeText(input.city),
		state: normalizeText(input.province),
		country: config.resolvedCountry || config.countryName,
		countrycodes: config.countryCode,
	});

	if (options?.includePostalCode !== false) {
		params.set("postalcode", normalizeText(input.postalCode));
	}

	if (config.contactEmail) {
		params.set("email", config.contactEmail);
	}

	const data = await fetchNominatimSearch(
		`${config.baseUrl}/search?${params.toString()}`,
		config.userAgent,
	);

	return mapFirstNominatimResult(data);
}

async function tryFreeTextSearch(
	input: GeocodeAddressInput,
	options?: {
		addressOverride?: string;
		includePostalCode?: boolean;
	},
) {
	const config = getGeocodingConfig(input);

	const q = [
		normalizeText(options?.addressOverride ?? input.address),
		normalizeText(input.city),
		options?.includePostalCode === false ? "" : normalizeText(input.postalCode),
		normalizeText(input.province),
		config.resolvedCountry || config.countryName,
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
		`${config.baseUrl}/search?${params.toString()}`,
		config.userAgent,
	);

	return mapFirstNominatimResult(data);
}

// Geocodifica usando Nominatim público.
// Estrategia:
// 1. Búsqueda estructurada exacta
// 2. Búsqueda estructurada sin código postal
// 3. Búsqueda estructurada quitando el número
// 4. Búsqueda libre con dirección completa
// 5. Búsqueda libre sin CP
// 6. Búsqueda libre sin número y sin CP
export async function geocodeAddress(
	input: GeocodeAddressInput,
): Promise<GeocodeAddressResult | null> {
	if (!hasEnoughAddressToGeocode(input)) {
		return null;
	}

	const normalizedAddress = normalizeText(input.address);
	const addressWithoutNumber = stripTrailingStreetNumber(normalizedAddress);

	const attempts: Array<() => Promise<GeocodeAddressResult | null>> = [
		() => tryStructuredSearch(input),
		() => tryStructuredSearch(input, { includePostalCode: false }),
		() =>
			addressWithoutNumber && addressWithoutNumber !== normalizedAddress
				? tryStructuredSearch(input, {
						addressOverride: addressWithoutNumber,
						includePostalCode: false,
					})
				: Promise.resolve(null),
		() => tryFreeTextSearch(input),
		() => tryFreeTextSearch(input, { includePostalCode: false }),
		() =>
			addressWithoutNumber && addressWithoutNumber !== normalizedAddress
				? tryFreeTextSearch(input, {
						addressOverride: addressWithoutNumber,
						includePostalCode: false,
					})
				: Promise.resolve(null),
	];

	for (const attempt of attempts) {
		const result = await attempt();

		if (result) {
			return result;
		}
	}

	return null;
}
