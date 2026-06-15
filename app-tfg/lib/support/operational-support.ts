import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type {
	SupportCapabilityItem,
	SupportCapabilityStatusCode,
	SupportCapabilitySummary,
} from "@/lib/contracts/support-status";

const MINIMUM_BROWSER_SUPPORT = [
	"Safari/iOS 16.4+",
	"Chrome 111+",
	"Edge 111+",
	"Firefox 111+",
];

function getStatusLabel(status: SupportCapabilityStatusCode) {
	if (status === "ready") {
		return "Disponible";
	}

	if (status === "warning") {
		return "Revisar";
	}

	return "No disponible";
}

function buildItem(
	input: Omit<SupportCapabilityItem, "statusLabel" | "lastCheckedAt">,
	lastCheckedAt: string,
): SupportCapabilityItem {
	return {
		...input,
		statusLabel: getStatusLabel(input.status),
		lastCheckedAt,
	};
}

function appPath(...segments: string[]) {
	return path.join(process.cwd(), ...segments);
}

function publicAssetExists(...segments: string[]) {
	return existsSync(appPath("public", ...segments));
}

function readPublicAsset(...segments: string[]) {
	const filePath = appPath("public", ...segments);

	if (!existsSync(filePath)) {
		return "";
	}

	return readFileSync(filePath, "utf8");
}

function formatPresence(isPresent: boolean) {
	return isPresent ? "Presente" : "No encontrado";
}

function resolveServiceWorkerStatus(swContent: string) {
	const hasCacheName = swContent.includes("CACHE_NAME");
	const hasOfflineFallback =
		swContent.includes("OFFLINE_URL") &&
		swContent.includes("caches.match(OFFLINE_URL)");
	const excludesPrivateApi =
		swContent.includes('url.pathname.startsWith("/api/")') &&
		swContent.includes("isPrivateOrApiRequest");
	const hasInstallLifecycle =
		swContent.includes("install") && swContent.includes("activate");

	return hasCacheName && hasOfflineFallback && excludesPrivateApi && hasInstallLifecycle
		? "ready"
		: "warning";
}

export function listSupportCapabilityItems(now = new Date()) {
	const lastCheckedAt = now.toISOString();
	const icon192Exists = publicAssetExists("icons", "icon-192.png");
	const icon512Exists = publicAssetExists("icons", "icon-512.png");
	const maskableIconExists = publicAssetExists(
		"icons",
		"icon-512-maskable.png",
	);
	const appleTouchIconExists = publicAssetExists(
		"icons",
		"apple-touch-icon.png",
	);
	const swContent = readPublicAsset("sw.js");
	const serviceWorkerExists = swContent.length > 0;
	const requiredPwaIconsReady = icon192Exists && icon512Exists && maskableIconExists;

	return [
		buildItem(
			{
				slug: "browser-compatibility-guard",
				title: "Control de navegador compatible",
				category: "Compatibilidad",
				status: "ready",
				description:
					"Filtro centralizado en proxy.ts que detecta navegadores por debajo del soporte mínimo de Next.js usado por la aplicación.",
				operationalUse:
					"Protege rutas de aplicación antes de cargar pantallas privadas, reduciendo errores por APIs modernas no disponibles.",
				degradationBehavior:
					"Si el navegador no cumple el mínimo, redirige a /unsupported-browser con una explicacion y alternativas de acceso.",
				evidence: [
					{
						label: "Ruta informativa",
						value: "/unsupported-browser",
					},
					{
						label: "Mínimos aceptados",
						value: MINIMUM_BROWSER_SUPPORT.join(", "),
					},
					{
						label: "Ubicación",
						value: "proxy.ts",
					},
				],
			},
			lastCheckedAt,
		),
		buildItem(
			{
				slug: "pwa-manifest",
				title: "Manifiesto instalable",
				category: "PWA",
				status: requiredPwaIconsReady ? "ready" : "warning",
				description:
					"Manifiesto generado desde app/manifest.ts para exponer nombre, iconos, modo standalone y orientacion móvil.",
				operationalUse:
					"Permite instalar KinEstilistas en dispositivos compatibles y conserva una identidad visual coherente.",
				degradationBehavior:
					"Si falta algun icono, la aplicación sigue funcionando en navegador, pero la instalacion puede perder calidad visual.",
				evidence: [
					{
						label: "Endpoint",
						value: "/manifest.webmanifest",
					},
					{
						label: "Icono 192",
						value: formatPresence(icon192Exists),
					},
					{
						label: "Icono 512",
						value: formatPresence(icon512Exists),
					},
					{
						label: "Icono maskable",
						value: formatPresence(maskableIconExists),
					},
					{
						label: "Apple touch icon",
						value: formatPresence(appleTouchIconExists),
					},
				],
			},
			lastCheckedAt,
		),
		buildItem(
			{
				slug: "service-worker-cache",
				title: "Service worker básico",
				category: "PWA",
				status: serviceWorkerExists
					? resolveServiceWorkerStatus(swContent)
					: "missing",
				description:
					"Service worker registrado desde el layout raiz para cachear el shell mínimo, iconos, manifiesto y una pantalla offline segura.",
				operationalUse:
					"Mejora la tolerancia ante cortes breves de conectividad sin cachear respuestas privadas de API, pedidos, rutas o perfiles.",
				degradationBehavior:
					"Si el service worker no se registra, la aplicación opera en modo web normal sin cache offline de soporte.",
				evidence: [
					{
						label: "Fichero",
						value: formatPresence(serviceWorkerExists),
					},
					{
						label: "Cache",
						value: swContent.match(/CACHE_NAME\s*=\s*"([^"]+)"/)?.[1] ?? "No detectada",
					},
					{
						label: "Fallback offline",
						value: swContent.includes("caches.match(OFFLINE_URL)")
							? "Definido"
							: "No detectado",
					},
					{
						label: "Exclusion API",
						value: swContent.includes('url.pathname.startsWith("/api/")')
							? "Definida"
							: "No detectada",
					},
				],
			},
			lastCheckedAt,
		),
		buildItem(
			{
				slug: "safe-form-hydration",
				title: "Formularios seguros ante hidratacion",
				category: "Experiencia",
				status: "ready",
				description:
					"Componente SafeForm reutilizado en formularios críticos para impedir envíos nativos accidentales antes de que React hidrate.",
				operationalUse:
					"Reduce fallos de UX en login, registro y formularios administrativos cuando la página aún está terminando de cargar.",
				degradationBehavior:
					"Si JavaScript tarda en estar listo, el formulario evita una navegación GET accidental y mantiene al usuario en contexto.",
				evidence: [
					{
						label: "Componente",
						value: "app/components/forms/SafeForm.tsx",
					},
					{
						label: "Ámbito",
						value: "Inicio de sesión, registro y formularios internos",
					},
				],
			},
			lastCheckedAt,
		),
	] satisfies SupportCapabilityItem[];
}

export function summarizeSupportCapabilityItems(
	items: SupportCapabilityItem[],
): SupportCapabilitySummary {
	const lastCheckedAt = items[0]?.lastCheckedAt ?? new Date().toISOString();

	return {
		total: items.length,
		ready: items.filter((item) => item.status === "ready").length,
		warning: items.filter((item) => item.status === "warning").length,
		missing: items.filter((item) => item.status === "missing").length,
		lastCheckedAt,
	};
}
