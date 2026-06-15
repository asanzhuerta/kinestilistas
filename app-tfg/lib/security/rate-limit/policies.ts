import type {
	RateLimitPolicy,
	RateLimitPolicyDescriptor,
	RateLimitPolicyName,
	RateLimitPolicyOverride,
} from "./types";

type RateLimitPolicyOverrideMap = Partial<
	Record<RateLimitPolicyName, RateLimitPolicyOverride>
>;

declare global {
	var __kinestilistasRateLimitPolicyOverrides:
		| RateLimitPolicyOverrideMap
		| undefined;
}

// -----------------------------------------------------------------------------
// POLÍTICAS CENTRALIZADAS DE RATE LIMIT
// -----------------------------------------------------------------------------
// Aquí definimos todos los límites reutilizables de la aplicación.
// La idea es mantener en un solo sitio:
//
// - cuánto permitimos
// - en qué ventana temporal
// - contra qué identidad limitamos (IP / usuario / email)
//
// Así evitamos "números mágicos" repartidos por el proyecto.
export const RATE_LIMIT_POLICIES = {
	DEFAULT_API: {
		name: "DEFAULT_API",
		keyPrefix: "@kinestilistas/ratelimit/default-api",
		maxRequests: 120,
		windowMs: 60 * 1000, // 1 minuto
		scope: "ip",
		message:
			"Demasiadas peticiones a la API. Inténtalo de nuevo en unos segundos.",
	},

	AUTH_API: {
		name: "AUTH_API",
		keyPrefix: "@kinestilistas/ratelimit/auth-api",
		maxRequests: 40,
		windowMs: 60 * 1000, // 1 minuto
		scope: "ip",
		message:
			"Se han realizado demásiadas operaciones de autenticación en poco tiempo.",
	},

	REGISTER_REQUEST: {
		name: "REGISTER_REQUEST",
		keyPrefix: "@kinestilistas/ratelimit/register-request",
		maxRequests: 5,
		windowMs: 30 * 60 * 1000, // 30 minutos
		scope: "ip",
		message:
			"Has enviado demásiadas solicitudes de registro en poco tiempo. Espera antes de volver a intentarlo.",
	},

	ADMIN_GENERIC_READ: {
		name: "ADMIN_GENERIC_READ",
		keyPrefix: "@kinestilistas/ratelimit/admin-read",
		maxRequests: 60,
		windowMs: 60 * 1000, // 1 minuto
		scope: "user_or_ip",
		message:
			"Se han realizado demásiadas consultas de administración en poco tiempo.",
	},

	ADMIN_GENERIC_WRITE: {
		name: "ADMIN_GENERIC_WRITE",
		keyPrefix: "@kinestilistas/ratelimit/admin-write",
		maxRequests: 30,
		windowMs: 60 * 1000, // 1 minuto
		scope: "user_or_ip",
		message:
			"Se han realizado demásiadas operaciones de administración en poco tiempo.",
	},

	ADMIN_USERS_READ: {
		name: "ADMIN_USERS_READ",
		keyPrefix: "@kinestilistas/ratelimit/admin-users-read",
		maxRequests: 30,
		windowMs: 60 * 1000, // 1 minuto
		scope: "user_or_ip",
		message:
			"Se han realizado demásiadas consultas del listado de usuarios en poco tiempo.",
	},

	ADMIN_USERS_WRITE: {
		name: "ADMIN_USERS_WRITE",
		keyPrefix: "@kinestilistas/ratelimit/admin-users-write",
		maxRequests: 15,
		windowMs: 60 * 1000, // 1 minuto
		scope: "user_or_ip",
		message:
			"Se han realizado demásiadas modificaciones de usuarios en poco tiempo.",
	},

	PROFILE_IMAGE_UPLOAD: {
		name: "PROFILE_IMAGE_UPLOAD",
		keyPrefix: "@kinestilistas/ratelimit/profile-image-upload",
		maxRequests: 10,
		windowMs: 10 * 60 * 1000, // 10 minutos
		scope: "user_or_ip",
		message:
			"Has subido demásiadas imágenes de perfil en poco tiempo. Espera antes de volver a intentarlo.",
	},

	LOGIN_IP: {
		name: "LOGIN_IP",
		keyPrefix: "@kinestilistas/ratelimit/login-ip",
		maxRequests: 10,
		windowMs: 10 * 60 * 1000, // 10 minutos
		scope: "ip",
		message:
			"Se han detectado demasiados intentos de acceso desde esta IP en poco tiempo.",
	},

	LOGIN_IDENTIFIER: {
		name: "LOGIN_IDENTIFIER",
		keyPrefix: "@kinestilistas/ratelimit/login-identifier",
		maxRequests: 8,
		windowMs: 15 * 60 * 1000, // 15 minutos
		scope: "email_or_ip",
		message:
			"Se han detectado demasiados intentos de acceso para esta cuenta en poco tiempo.",
	},
} as const satisfies Record<string, RateLimitPolicy>;

export const RATE_LIMIT_POLICY_DESCRIPTORS: Record<
	RateLimitPolicyName,
	RateLimitPolicyDescriptor
> = {
	DEFAULT_API: {
		title: "API general",
		description:
			"Límite base para rutas API comunes que no tienen una política más específica.",
	},
	AUTH_API: {
		title: "Autenticación API",
		description:
			"Protege rutas auxiliares de autenticación como proveedores, callbacks y cierre de sesión.",
	},
	REGISTER_REQUEST: {
		title: "Solicitud de registro",
		description:
			"Reduce el abuso del formulario de alta de clientes desde la pantalla pública.",
	},
	ADMIN_GENERIC_READ: {
		title: "Lectura de administración",
		description:
			"Controla las consultas GET de administración fuera del módulo de usuarios.",
	},
	ADMIN_GENERIC_WRITE: {
		title: "Escritura de administración",
		description:
			"Controla altas, cambios y acciones mutables del panel de administración.",
	},
	ADMIN_USERS_READ: {
		title: "Lectura de usuarios en administración",
		description:
			"Limita el acceso frecuente al listado y detalle de usuarios desde administración.",
	},
	ADMIN_USERS_WRITE: {
		title: "Escritura de usuarios en administración",
		description:
			"Limita cambios de usuarios, estados, roles y operaciones sensibles relacionadas.",
	},
	PROFILE_IMAGE_UPLOAD: {
		title: "Subida de imagen de perfil",
		description:
			"Evita abusos al subir imágenes de perfil repetidamente en un corto intervalo.",
	},
	LOGIN_IP: {
		title: "Inicio de sesión por IP",
		description:
			"Bloquea ataques de fuerza bruta repetidos desde una misma IP.",
	},
	LOGIN_IDENTIFIER: {
		title: "Inicio de sesión por cuenta",
		description:
			"Bloquea intentos repetidos contra un mismo correo, usuario o teléfono.",
	},
};

function sanitizeRateLimitPolicyOverride(
	override: RateLimitPolicyOverride | null | undefined,
) {
	if (!override) {
		return null;
	}

	const sanitizedOverride: RateLimitPolicyOverride = {};

	if (typeof override.enabled === "boolean") {
		sanitizedOverride.enabled = override.enabled;
	}

	if (
		typeof override.maxRequests === "number" &&
		Number.isInteger(override.maxRequests) &&
		override.maxRequests > 0
	) {
		sanitizedOverride.maxRequests = override.maxRequests;
	}

	if (
		typeof override.windowMs === "number" &&
		Number.isInteger(override.windowMs) &&
		override.windowMs > 0
	) {
		sanitizedOverride.windowMs = override.windowMs;
	}

	return Object.keys(sanitizedOverride).length > 0 ? sanitizedOverride : null;
}

export function setRateLimitPolicyOverrides(
	overrides: RateLimitPolicyOverrideMap,
) {
	const nextOverrides: RateLimitPolicyOverrideMap = {};

	for (const name of Object.keys(RATE_LIMIT_POLICIES) as RateLimitPolicyName[]) {
		const sanitizedOverride = sanitizeRateLimitPolicyOverride(overrides[name]);

		if (sanitizedOverride) {
			nextOverrides[name] = sanitizedOverride;
		}
	}

	globalThis.__kinestilistasRateLimitPolicyOverrides = nextOverrides;
}

export function getRateLimitPolicyOverrides() {
	return globalThis.__kinestilistasRateLimitPolicyOverrides ?? {};
}

export function getRateLimitPolicy(name: RateLimitPolicyName): RateLimitPolicy {
	const basePolicy = RATE_LIMIT_POLICIES[name];
	const override = getRateLimitPolicyOverrides()[name];

	return {
		...basePolicy,
		enabled: override?.enabled ?? true,
		maxRequests: override?.maxRequests ?? basePolicy.maxRequests,
		windowMs: override?.windowMs ?? basePolicy.windowMs,
	};
}

export function listConfiguredRateLimitPolicies() {
	return (Object.keys(RATE_LIMIT_POLICIES) as RateLimitPolicyName[]).map(
		(name) => getRateLimitPolicy(name),
	);
}

// -----------------------------------------------------------------------------
// RESOLUCIÓN DE POLÍTICAS SEGÚN RUTA Y MÉTODO
// -----------------------------------------------------------------------------
// Decide qué política de rate limit aplicar a una API route concreta.
// El criterio principal es:
//
// - rutas especialmente sensibles: auth, registro, uploads
// - rutas de administración
// - resto de API: política por defecto
export function resolveApiRateLimitPolicy(pathname: string, method: string) {
	const normalizedMethod = method.toUpperCase();

	if (
		pathname.startsWith("/api/auth/callback/credentials") ||
		pathname.startsWith("/api/auth/session")
	) {
		return null;
	}

	if (pathname.startsWith("/api/profile/upload-image")) {
		return getRateLimitPolicy("PROFILE_IMAGE_UPLOAD");
	}

	if (pathname.startsWith("/api/auth/register-request")) {
		return getRateLimitPolicy("REGISTER_REQUEST");
	}

	if (pathname.startsWith("/api/auth/")) {
		return getRateLimitPolicy("AUTH_API");
	}

	if (pathname.startsWith("/api/admin/users")) {
		return normalizedMethod === "GET"
			? getRateLimitPolicy("ADMIN_USERS_READ")
			: getRateLimitPolicy("ADMIN_USERS_WRITE");
	}

	if (pathname.startsWith("/api/admin/")) {
		return normalizedMethod === "GET"
			? getRateLimitPolicy("ADMIN_GENERIC_READ")
			: getRateLimitPolicy("ADMIN_GENERIC_WRITE");
	}

	return getRateLimitPolicy("DEFAULT_API");
}
