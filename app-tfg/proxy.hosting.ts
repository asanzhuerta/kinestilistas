// Proxy de seguridad preparado para despliegues Next.js compatibles.
//
// No se llama `proxy.ts` en el despliegue de demostracion de Netlify porque
// el runtime de Netlify para Next.js 16 empaqueta este proxy como Edge Function
// y provoca `nextHandler is not a function`.
//
// Para un hosting Node/Next compatible, renombrar este archivo a `proxy.ts`
// reactiva la capa previa de rate limiting, compatibilidad de navegador y
// redirecciones por sesion/rol antes de llegar a paginas y Route Handlers.
import { auth } from "@/auth";
import { NextRequest, NextResponse, userAgent } from "next/server";
import {
	applyRateLimit,
	createRateLimitExceededResponse,
	getClientIpFromHeaders,
	resolveApiRateLimitPolicy,
	resolveRateLimitIdentifier,
} from "@/lib/security/rate-limit";

// -----------------------------------------------------------------------------
// HELPERS DE COMPATIBILIDAD DE NAVEGADOR
// -----------------------------------------------------------------------------
// Compara dos versiones en formato "16.4", "15.6.1", etc.
// Devuelve:
// -1 si current < minimum
//  0 si current === minimum
//  1 si current > minimum
function compareVersions(current: string, minimum: string) {
	const currentParts = current.split(".").map((part) => Number(part) || 0);
	const minimumParts = minimum.split(".").map((part) => Number(part) || 0);
	const maxLength = Math.max(currentParts.length, minimumParts.length);

	for (let i = 0; i < maxLength; i += 1) {
		const currentValue = currentParts[i] ?? 0;
		const minimumValue = minimumParts[i] ?? 0;

		if (currentValue > minimumValue) return 1;
		if (currentValue < minimumValue) return -1;
	}

	return 0;
}

// Determina si el navegador está por debajo del soporte mínimo que queremos aceptar.
// Next.js marca como baseline moderno Safari 16.4+, Chrome 111+, Edge 111+ y Firefox 111+.
// En iPhone/iPad antiguos, aunque uses Chrome u otro navegador, por debajo siguen
// dependiendo de WebKit/iOS y suelen compartir las mismas limitaciones de compatibilidad.
function isUnsupportedBrowser(req: Parameters<typeof userAgent>[0]) {
	const { browser, os } = userAgent(req);

	const browserName = (browser.name ?? "").toLowerCase();
	const browserVersion = browser.version ?? "0";
	const osName = (os.name ?? "").toLowerCase();
	const osVersion = os.version ?? "0";

	// iPhone / iPad antiguos
	if (
		(osName.includes("ios") || osName.includes("ipad")) &&
		compareVersions(osVersion, "16.4") < 0
	) {
		return true;
	}

	// Safari de macOS antiguo
	if (
		browserName.includes("safari") &&
		!browserName.includes("chrome") &&
		!browserName.includes("chromium") &&
		compareVersions(browserVersion, "16.4") < 0
	) {
		return true;
	}

	// Chrome antiguo
	if (
		browserName.includes("chrome") &&
		!browserName.includes("edge") &&
		compareVersions(browserVersion, "111") < 0
	) {
		return true;
	}

	// Edge antiguo
	if (
		browserName.includes("edge") &&
		compareVersions(browserVersion, "111") < 0
	) {
		return true;
	}

	// Firefox antiguo
	if (
		browserName.includes("firefox") &&
		compareVersions(browserVersion, "111") < 0
	) {
		return true;
	}

	return false;
}

// -----------------------------------------------------------------------------
// HELPERS DE REDIRECCIÓN SEGURA EN TÚNELES / PROXIES
// -----------------------------------------------------------------------------
// Cuando la app está detrás de un túnel o de un reverse proxy, usar directamente
// `new URL("/ruta", nextUrl)` puede provocar URLs incorrectas si el host público
// no coincide exactamente con el host/puerto interno del servidor.
//
// Esto se nota especialmente con túneles como Dev Tunnels, donde la URL pública
// ya lleva el puerto "embebido" en el subdominio, y añadir además ":3000"
// genera enlaces rotos como:
// https://mi-tunel-3000.devtunnels.ms:3000/admin
//
// Para evitarlo, reconstruimos el origen público usando cabeceras forwarded
// cuando estén disponibles, y tratamos de forma especial hosts de túneles.
function getForwardedHeaderValue(headers: Headers, name: string) {
	const rawValue = headers.get(name);

	if (!rawValue) return null;

	return rawValue.split(",")[0]?.trim() || null;
}

// Devuelve el origen público correcto de la request.
// Prioriza x-forwarded-proto / x-forwarded-host cuando existan.
function getPublicOrigin(req: NextRequest) {
	const forwardedProto = getForwardedHeaderValue(
		req.headers,
		"x-forwarded-proto",
	);
	const forwardedHost = getForwardedHeaderValue(
		req.headers,
		"x-forwarded-host",
	);

	const protocol = forwardedProto || req.nextUrl.protocol.replace(":", "");
	const hostname = req.nextUrl.hostname;
	const host = req.nextUrl.host;

	const isTunnelHost =
		hostname.endsWith(".devtunnels.ms") ||
		hostname.endsWith(".trycloudflare.com");

	// En túneles públicos NO queremos conservar un puerto extra en la URL final,
	// porque la URL pública ya identifica correctamente el destino.
	const publicHost = isTunnelHost ? hostname : forwardedHost || host;

	return `${protocol}://${publicHost}`;
}

// Construye una URL absoluta segura para redirecciones internas.
function buildRedirectUrl(req: NextRequest, pathname: string) {
	return new URL(pathname, getPublicOrigin(req));
}

// -----------------------------------------------------------------------------
// PROXY PRINCIPAL
// -----------------------------------------------------------------------------
// Este proxy se ejecuta antes de servir las rutas que indique el matcher.
// Aquí centralizamos:
//
// 1. Rate limiting global para API routes.
// 2. Bloqueo de navegadores no compatibles.
// 3. Protección de rutas privadas.
// 4. Redirección según rol si un usuario autenticado intenta entrar en login/register.
//
// Además, aquí resolvemos las redirecciones de forma segura para túneles
// y proxies inversos, evitando construir URLs incorrectas con puertos extra.
//
// En Next.js 16, el archivo recomendado es proxy.ts en la raíz del proyecto,
// y puede hacer redirecciones o responder directamente antes de completar la request.
export default auth((req) => {
	const { nextUrl } = req;
	const session = req.auth;
	const pathname = nextUrl.pathname;
	const method = req.method.toUpperCase();

	// -------------------------------------------------------------------------
	// RATE LIMITING GLOBAL PARA API ROUTES
	// -------------------------------------------------------------------------
	// Aplicamos rate limiting antes de llegar a los Route Handlers de /api.
	// Esto permite cortar tráfico abusivo de forma centralizada sin tener que
	// repetir lógica endpoint por endpoint.
	const isApiRoute = pathname.startsWith("/api");

	if (isApiRoute) {
		// Dejamos pasar métodos auxiliares que no nos interesa limitar aquí.
		if (method === "OPTIONS" || method === "HEAD") {
			return NextResponse.next();
		}

		const policy = resolveApiRateLimitPolicy(pathname, method);
		if (!policy) {
			return NextResponse.next();
		}

		const ipAddress = getClientIpFromHeaders(req.headers);
		const identifier = resolveRateLimitIdentifier(policy, {
			ipAddress,
			userId: session?.user?.id ?? null,
			email: session?.user?.email ?? null,
		});
		const rateLimitResult = applyRateLimit(policy, identifier);

		if (!rateLimitResult.success) {
			return createRateLimitExceededResponse(policy, rateLimitResult);
		}

		// Si no se supera el límite, dejamos continuar hacia el Route Handler.
		return NextResponse.next();
	}

	// -------------------------------------------------------------------------
	// CONTROL DE COMPATIBILIDAD DE NAVEGADOR
	// -------------------------------------------------------------------------
	// Si el navegador no es compatible, redirigimos a una página informativa
	// antes de que intente cargar el resto de la aplicación.
	if (isUnsupportedBrowser(req)) {
		const unsupportedUrl = buildRedirectUrl(req, "/unsupported-browser");
		unsupportedUrl.searchParams.set("from", pathname);

		return NextResponse.redirect(unsupportedUrl);
	}

	// -------------------------------------------------------------------------
	// DATOS DE SESIÓN Y CONTEXTO DE RUTA
	// -------------------------------------------------------------------------
	const isLoggedIn = !!session?.user;
	const role = session?.user?.role;

	const isAdminRoute = pathname.startsWith("/admin");
	const isCommercialRoute = pathname.startsWith("/commercials");
	const isClientRoute = pathname.startsWith("/clients");

	const isAuthRoute =
		pathname.startsWith("/login") || pathname.startsWith("/register");

	// -------------------------------------------------------------------------
	// PROTECCIÓN DE RUTAS PRIVADAS
	// -------------------------------------------------------------------------
	// Si el usuario no está autenticado y trata de entrar a una zona privada,
	// lo enviamos al login.
	if (!isLoggedIn && (isAdminRoute || isCommercialRoute || isClientRoute)) {
		return NextResponse.redirect(buildRedirectUrl(req, "/login"));
	}

	// -------------------------------------------------------------------------
	// EVITAR QUE UN USUARIO AUTENTICADO VUELVA A LOGIN / REGISTER
	// -------------------------------------------------------------------------
	// Si ya tiene sesión iniciada, lo redirigimos a su panel correspondiente.
	if (isLoggedIn && isAuthRoute) {
		if (role === "admin") {
			return NextResponse.redirect(buildRedirectUrl(req, "/admin"));
		}

		if (role === "commercial") {
			return NextResponse.redirect(buildRedirectUrl(req, "/commercials"));
		}

		if (role === "client") {
			return NextResponse.redirect(buildRedirectUrl(req, "/clients"));
		}
	}

	// -------------------------------------------------------------------------
	// RESTRICCIÓN POR ROL
	// -------------------------------------------------------------------------
	// Si el usuario intenta entrar en una zona que no corresponde a su rol,
	// se le redirige al login.
	if (isAdminRoute && role !== "admin") {
		return NextResponse.redirect(buildRedirectUrl(req, "/login"));
	}

	if (isCommercialRoute && role !== "commercial") {
		return NextResponse.redirect(buildRedirectUrl(req, "/login"));
	}

	if (isClientRoute && role !== "client") {
		return NextResponse.redirect(buildRedirectUrl(req, "/login"));
	}

	// Si no se ha activado ninguna redirección, dejamos continuar la request.
	return NextResponse.next();
});

// -----------------------------------------------------------------------------
// MATCHER
// -----------------------------------------------------------------------------
// Hacemos que el proxy se aplique prácticamente a toda la aplicación,
// incluyendo:
// - API routes
//
// y excluyendo:
// - recursos internos de Next
// - favicon
// - manifest
// - la propia página de navegador no compatible
//
// Esto es importante porque queremos que el rate limiting global también
// se aplique a /api/*, mientras que el control de navegador y auth siguen
// cubriendo el resto de páginas de la aplicación.
export const config = {
	matcher: [
		"/api/:path*",
		"/((?!api|_next/static|_next/image|favicon.ico|manifest.webmanifest|unsupported-browser).*)",
	],
};
