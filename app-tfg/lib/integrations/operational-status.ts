import type {
	IntegrationStatusCode,
	IntegrationStatusItem,
	IntegrationStatusSummary,
} from "@/lib/contracts/integration-status";
import { normalizeText } from "@/lib/utils/text";

function hasEnv(name: string) {
	return Boolean(normalizeText(process.env[name]));
}

function envPresence(name: string) {
	return hasEnv(name) ? "Configurada" : "No definida";
}

function envValue(name: string, fallback: string) {
	return normalizeText(process.env[name]) || fallback;
}

function isValidUrl(value: string) {
	try {
		new URL(value);
		return true;
	} catch {
		return false;
	}
}

function getStatusLabel(status: IntegrationStatusCode) {
	if (status === "operational") {
		return "Operativa";
	}

	if (status === "degraded") {
		return "Revisar";
	}

	return "No configurada";
}

function buildItem(
	input: Omit<IntegrationStatusItem, "statusLabel" | "lastCheckedAt">,
	lastCheckedAt: string,
): IntegrationStatusItem {
	return {
		...input,
		statusLabel: getStatusLabel(input.status),
		lastCheckedAt,
	};
}

export function listIntegrationStatusItems(now = new Date()) {
	const lastCheckedAt = now.toISOString();
	const cloudinaryConfigured =
		hasEnv("CLOUDINARY_CLOUD_NAME") &&
		hasEnv("CLOUDINARY_API_KEY") &&
		hasEnv("CLOUDINARY_API_SECRET");
	const geocodingProvider = envValue("GEOCODING_PROVIDER", "nominatim");
	const geocodingBaseUrl = envValue(
		"GEOCODING_BASE_URL",
		"https://nominatim.openstreetmap.org",
	);
	const geocodingProviderSupported =
		!geocodingProvider ||
		normalizeText(geocodingProvider).toLowerCase() === "nominatim";
	const osrmBaseUrl = envValue(
		"NEXT_PUBLIC_OSRM_BASE_URL",
		"https://router.project-osrm.org",
	);
	const quickChartBaseUrl = "https://quickchart.io/qr";

	return [
		buildItem(
			{
				slug: "cloudinary-images",
				title: "Almacenamiento de imagenes",
				provider: "Cloudinary",
				category: "Activos multimedia",
				status: cloudinaryConfigured ? "operational" : "not_configured",
				description:
					"Subida, reemplazo y validacion de imagenes de perfil, catalogo y resultados finales del salon.",
				operationalUse:
					"Usado por M1 para perfil, M3 para catalogo/coloracion y M5 para imagenes finales de servicios.",
				fallbackBehavior:
					"Si las credenciales no estan completas se mantienen las imagenes ya guardadas, pero las rutas de subida no pueden completar nuevas cargas.",
				configuration: [
					{
						label: "Cloud name",
						value: envPresence("CLOUDINARY_CLOUD_NAME"),
					},
					{
						label: "API key",
						value: envPresence("CLOUDINARY_API_KEY"),
						sensitive: true,
					},
					{
						label: "API secret",
						value: envPresence("CLOUDINARY_API_SECRET"),
						sensitive: true,
					},
					{
						label: "Carpeta perfil",
						value: envValue(
							"CLOUDINARY_PROFILE_IMAGES_FOLDER",
							"kinestilistas/profile-images",
						),
					},
					{
						label: "Carpeta catalogo",
						value: envValue(
							"CLOUDINARY_CATALOG_IMAGES_FOLDER",
							"kinestilistas/catalog-images",
						),
					},
					{
						label: "Carpeta salon",
						value: envValue(
							"CLOUDINARY_SALON_RESULT_IMAGES_FOLDER",
							"kinestilistas/salon-result-images",
						),
					},
				],
			},
			lastCheckedAt,
		),
		buildItem(
			{
				slug: "geocoding-nominatim",
				title: "Geocodificacion de direcciones",
				provider: "Nominatim / OpenStreetMap",
				category: "Geolocalizacion",
				status:
					geocodingProviderSupported && isValidUrl(geocodingBaseUrl)
						? "operational"
						: "degraded",
				description:
					"Convierte direcciones de clientes y puntos operativos en coordenadas reutilizables por rutas y estimaciones.",
				operationalUse:
					"Usado por M2 para clientes, ubicaciones de comerciales y planificacion de visitas.",
				fallbackBehavior:
					"Si el proveedor no responde, el sistema mantiene los datos existentes y permite conservar direcciones sin coordenadas hasta reintentar.",
				configuration: [
					{
						label: "Proveedor",
						value: geocodingProvider || "nominatim",
					},
					{
						label: "Base URL",
						value: geocodingBaseUrl,
					},
					{
						label: "Pais",
						value: envValue("GEOCODING_COUNTRY_NAME", "Espana"),
					},
					{
						label: "Codigo pais",
						value: envValue("GEOCODING_COUNTRY_CODE", "es"),
					},
					{
						label: "Email contacto",
						value: envPresence("GEOCODING_EMAIL"),
						sensitive: true,
					},
				],
			},
			lastCheckedAt,
		),
		buildItem(
			{
				slug: "routing-osrm",
				title: "Calculo visual de rutas",
				provider: "OSRM",
				category: "Rutas comerciales",
				status: isValidUrl(osrmBaseUrl) ? "operational" : "degraded",
				description:
					"Calcula la geometria de rutas visibles en mapa a partir de los puntos comerciales planificados.",
				operationalUse:
					"Usado por M2 en la previsualizacion de rutas comerciales y mapas de visitas.",
				fallbackBehavior:
					"Si OSRM no responde, el mapa conserva los marcadores y la operativa comercial puede continuar sin trazado calculado.",
				configuration: [
					{
						label: "Base URL",
						value: osrmBaseUrl,
					},
					{
						label: "Modo",
						value: "driving",
					},
				],
			},
			lastCheckedAt,
		),
		buildItem(
			{
				slug: "order-qr-quickchart",
				title: "QR operativo de pedido",
				provider: "QuickChart",
				category: "Reparto y validacion",
				status: "operational",
				description:
					"Genera la imagen QR del pedido a partir de un payload interno validable durante el reparto.",
				operationalUse:
					"Usado por M4 para validar entrega mediante lectura o introduccion manual del identificador de pedido.",
				fallbackBehavior:
					"Si la imagen QR no carga, el flujo permite introducir manualmente el identificador del pedido.",
				configuration: [
					{
						label: "Endpoint",
						value: quickChartBaseUrl,
					},
					{
						label: "Payload",
						value: "kinestilistas-order:<orderId>",
					},
				],
			},
			lastCheckedAt,
		),
	] satisfies IntegrationStatusItem[];
}

export function summarizeIntegrationStatusItems(
	items: IntegrationStatusItem[],
): IntegrationStatusSummary {
	const lastCheckedAt = items[0]?.lastCheckedAt ?? new Date().toISOString();

	return {
		total: items.length,
		operational: items.filter((item) => item.status === "operational").length,
		degraded: items.filter((item) => item.status === "degraded").length,
		notConfigured: items.filter((item) => item.status === "not_configured")
			.length,
		lastCheckedAt,
	};
}
