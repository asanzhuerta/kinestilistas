import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { isPersistedAccessSessionActive } from "@/lib/typeorm/services/auth/access-session";
import { findUserForLogin } from "@/lib/typeorm/services/auth/find-user-for-login";
import { logAccessEvent } from "@/lib/typeorm/services/auth/log-access-event";
import { registerSuccessfulLogin } from "@/lib/typeorm/services/auth/register-successful-login";
import {
	applyRateLimit,
	getClientIpFromHeaders,
	normalizeRateLimitEmail,
	RATE_LIMIT_POLICIES,
	resolveRateLimitIdentifier,
} from "@/lib/security/rate-limit";

// -----------------------------------------------------------------------------
// EXTENSIÓN DE TIPOS DE SESIÓN
// -----------------------------------------------------------------------------
// Añadimos a la sesión los campos personalizados que necesitamos en la app,
// además de un identificador de sesión de acceso que usamos para trazabilidad.
declare module "next-auth" {
	interface Session {
		user: {
			id: string;
			role: string;
			name?: string | null;
			email?: string | null;
			phone?: string | null;
			image?: string | null;
		};
		accessSessionId?: string;
	}
}

// -----------------------------------------------------------------------------
// EXTENSIÓN DE TIPOS DEL JWT
// -----------------------------------------------------------------------------
// Añadimos al token JWT los mismos campos personalizados para poder trasladarlos
// después a la sesión del usuario autenticado.
declare module "@auth/core/jwt" {
	interface JWT {
		role?: string;
		phone?: string | null;
		name?: string | null;
		image?: string | null;
		accessSessionId?: string;
	}
}

// -----------------------------------------------------------------------------
// HELPERS PARA LOGS
// -----------------------------------------------------------------------------
// Comprueba si un valor es un objeto no nulo para poder leer propiedades
// dinámicas con seguridad.
function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

// Intenta extraer el tipo lógico del error de Auth.js.
// En muchos errores de Auth.js existe la propiedad "type", que es más útil
// para mostrar logs compactos que el stack completo.
function getAuthErrorType(error: unknown): string | null {
	if (error instanceof Error && "type" in error) {
		const errorType = (error as Error & { type?: unknown }).type;
		return typeof errorType === "string" ? errorType : null;
	}

	if (!isRecord(error)) return null;

	if (typeof error.type === "string") {
		return error.type;
	}

	return null;
}

// Devuelve un mensaje compacto y legible para la consola.
function getCompactErrorMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}

	if (typeof error === "string") {
		return error;
	}

	if (isRecord(error) && typeof error.message === "string") {
		return error.message;
	}

	return "";
}

// -----------------------------------------------------------------------------
// HELPERS PARA RATE LIMIT DEL LOGIN
// -----------------------------------------------------------------------------
// Aplica una limitación adicional específica al flujo de login.
// La idea es frenar ataques de fuerza bruta antes de llegar a:
//
// - búsqueda del usuario en BD
// - comparación bcrypt
// - escritura de logs de acceso
//
// Si el límite salta, devolvemos null de forma silenciosa para no dar pistas
// al atacante y para evitar cargar todavía más la base de datos bajo ataque.
function isLoginRateLimited(headers: Headers, identifier: string) {
	const ipAddress = getClientIpFromHeaders(headers);

	const ipPolicy = RATE_LIMIT_POLICIES.LOGIN_IP;
	const ipRateLimitIdentifier = resolveRateLimitIdentifier(ipPolicy, {
		ipAddress,
		userId: null,
		email: null,
	});

	const ipRateLimitResult = applyRateLimit(ipPolicy, ipRateLimitIdentifier);

	if (!ipRateLimitResult.success) {
		console.warn("[login] intento bloqueado por rate limit de IP.");
		return true;
	}

	if (identifier) {
		const identifierPolicy = RATE_LIMIT_POLICIES.LOGIN_IDENTIFIER;
		const identifierRateLimitIdentifier = resolveRateLimitIdentifier(
			identifierPolicy,
			{
				ipAddress,
				userId: null,
				email: identifier,
			},
		);

		const identifierRateLimitResult = applyRateLimit(
			identifierPolicy,
			identifierRateLimitIdentifier,
		);

		if (!identifierRateLimitResult.success) {
			console.warn(
				"[login] intento bloqueado por rate limit de identificador.",
			);
			return true;
		}
	}

	return false;
}

// -----------------------------------------------------------------------------
// CONFIGURACIÓN PRINCIPAL DE AUTH
// -----------------------------------------------------------------------------
export const { handlers, auth, signIn, signOut } = NextAuth({
	// Permite confiar en la cabecera Host, útil especialmente detrás de proxies
	// o en determinados entornos de despliegue.
	trustHost: true,

	// Configuración de sesión basada en JWT.
	session: {
		strategy: "jwt",
		maxAge: 60 * 60 * 24 * 30,
	},

	// -------------------------------------------------------------------------
	// PROVEEDOR DE CREDENCIALES
	// -------------------------------------------------------------------------
	// Login manual con identificador + contraseña.
	providers: [
		Credentials({
			credentials: {
				identifier: {},
				password: {},
			},

			async authorize(credentials, request) {
				try {
					// Normalizamos el identificador para que el login no dependa
					// de mayúsculas, minúsculas o espacios accidentales.
					const identifier = normalizeRateLimitEmail(
						String(credentials?.identifier ?? ""),
					);

					// La contraseña se toma tal cual.
					const password = String(credentials?.password ?? "");

					// Intentamos capturar IP real del cliente desde cabeceras
					// habituales de proxy o balanceador.
					const ipAddress = getClientIpFromHeaders(request.headers);

					// Capturamos el user agent para trazabilidad de accesos.
					const userAgent = request.headers.get("user-agent") || null;

					// Antes de tocar la BD, aplicamos rate limiting específico
					// para el flujo de autenticación.
					if (isLoginRateLimited(request.headers, identifier)) {
						return null;
					}

					// Si faltan credenciales, registramos el intento fallido y
					// devolvemos null para que Auth.js trate el login como inválido.
					if (!identifier || !password) {
						await logAccessEvent({
							userId: null,
							emailAttempted: identifier || null,
							eventCode: "login_failed",
							resultCode: "failed",
							failureReason: "missing_credentials",
							sessionToken: null,
							ipAddress,
							userAgent,
							revokedAt: null,
							expiresAt: null,
						});

						return null;
					}

					// Buscamos al usuario por su identificador de login.
					const user = await findUserForLogin(identifier);

					// Si no existe, registramos el intento fallido.
					if (!user) {
						await logAccessEvent({
							userId: null,
							emailAttempted: identifier,
							eventCode: "login_failed",
							resultCode: "failed",
							failureReason: "user_not_found",
							sessionToken: null,
							ipAddress,
							userAgent,
							revokedAt: null,
							expiresAt: null,
						});

						return null;
					}

					// Solo permitimos acceso a usuarios activos.
					if (user.status.code !== "active") {
						await logAccessEvent({
							userId: user.id,
							emailAttempted: user.email,
							eventCode: "login_failed",
							resultCode: "failed",
							failureReason: `status_${user.status.code}`,
							sessionToken: null,
							ipAddress,
							userAgent,
							revokedAt: null,
							expiresAt: null,
						});

						return null;
					}

					// Comparamos la contraseña introducida con el hash almacenado.
					const validPassword = await bcrypt.compare(
						password,
						user.password_hash,
					);

					// Si la contraseña no es válida, registramos el intento fallido.
					if (!validPassword) {
						await logAccessEvent({
							userId: user.id,
							emailAttempted: user.email,
							eventCode: "login_failed",
							resultCode: "failed",
							failureReason: "invalid_password",
							sessionToken: null,
							ipAddress,
							userAgent,
							revokedAt: null,
							expiresAt: null,
						});

						return null;
					}

					// Generamos un identificador único para la sesión de acceso
					// que usaremos en el log de accesos.
					const accessSessionId = randomUUID();

					// Fecha de expiración lógica asociada a la sesión registrada.
					const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

					// Actualizamos datos relacionados con el login correcto
					// como por ejemplo last_login_at si ese servicio lo hace.
					await registerSuccessfulLogin(user.id);

					// Registramos el login exitoso en la tabla de auditoría.
					await logAccessEvent({
						userId: user.id,
						emailAttempted: user.email,
						eventCode: "login_success",
						resultCode: "success",
						failureReason: null,
						sessionToken: accessSessionId,
						ipAddress,
						userAgent,
						revokedAt: null,
						expiresAt,
					});

					// Devolvemos el usuario autenticado con los campos que
					// necesitamos propagar al JWT y a la sesión.
					return {
						id: user.id,
						email: user.email,
						phone: user.phone,
						role: user.role.code,
						name: user.name,
						image: user.profile_image_url,
						accessSessionId,
					};
				} catch (error) {
					// Error inesperado dentro del authorize.
					// Lo registramos como error técnico y devolvemos null para no romper
					// el flujo de autenticación del usuario.
					console.error("[login] error en authorize:", error);
					return null;
				}
			},
		}),
	],

	// Página personalizada de login.
	pages: {
		signIn: "/login",
	},

	// -------------------------------------------------------------------------
	// LOGGER PERSONALIZADO
	// -------------------------------------------------------------------------
	// Sobrescribimos el logger por defecto de Auth.js para acortar mucho
	// los mensajes en consola y evitar trazas kilométricas en errores esperables.
	logger: {
		error(error) {
			const errorType = getAuthErrorType(error);
			const details = getCompactErrorMessage(error);

			// Error esperable cuando el usuario introduce mal las credenciales.
			// No hace falta imprimir una traza enorme.
			if (errorType === "CredentialsSignin") {
				console.warn("[auth] Login rejected: incorrect credentials.");
				return;
			}

			// Error relevante: normalmente indica que se ha lanzado una acción de auth
			// sin el token CSRF necesario.
			if (errorType === "MissingCSRF") {
				console.error(
					"[auth] MissingCSRF: missing CSRF token in authentication action.",
				);
				return;
			}

			// Para el resto de errores, mostramos una línea corta.
			if (errorType && details) {
				console.error(`[auth] ${errorType}: ${details}`);
				return;
			}

			if (errorType) {
				console.error(`[auth] ${errorType}`);
				return;
			}

			if (details) {
				console.error(`[auth] ${details}`);
				return;
			}

			console.error("[auth] Untyped authentication error.");
		},

		warn(code) {
			console.warn(`[auth] ${code}`);
		},

		debug(code) {
			void code;
			// Silenciado para no ensuciar la consola con ruido innecesario.
			// Si quieres ver trazas de debug, puedes descomentar la línea siguiente.
			// console.debug(`[auth] ${code}`);
		},
	},

	// -------------------------------------------------------------------------
	// CALLBACKS
	// -------------------------------------------------------------------------
	callbacks: {
		// El callback jwt se ejecuta al crear o actualizar el token.
		// Aquí copiamos al JWT los campos personalizados que devuelve authorize().
		async jwt({ token, user }) {
			if (user) {
				if ("id" in user && typeof user.id === "string") {
					token.sub = user.id;
				}
				if ("role" in user) token.role = user.role as string;
				if ("phone" in user) token.phone = user.phone as string | null;
				if ("name" in user) token.name = user.name as string | null;
				if ("image" in user) token.image = user.image as string | null;
				if ("accessSessionId" in user) {
					token.accessSessionId = user.accessSessionId as string;
				}
			}

			const accessSessionId =
				typeof token.accessSessionId === "string"
					? token.accessSessionId
					: null;
			const userId = typeof token.sub === "string" ? token.sub : null;

			if (!accessSessionId || !userId) {
				return token;
			}

			const isActiveSession = await isPersistedAccessSessionActive({
				sessionToken: accessSessionId,
				userId,
			});

			if (!isActiveSession) {
				return {} as typeof token;
			}

			return token;
		},

		// El callback session transforma el JWT en la sesión accesible desde la app.
		// Aquí exponemos en session.user los datos que luego necesita el frontend
		// y también el accessSessionId para comprobaciones adicionales si hace falta.
		async session({ session, token }) {
			const accessSessionId =
				typeof token.accessSessionId === "string"
					? token.accessSessionId
					: null;
			const role = typeof token.role === "string" ? token.role : "";

			if (!session.user || !token.sub || !role || !accessSessionId) {
				return {} as typeof session;
			}

			session.user.id = token.sub;
			session.user.role = role;
			session.user.phone =
				typeof token.phone === "string" ? token.phone : null;
			session.user.name = typeof token.name === "string" ? token.name : null;
			session.user.image =
				typeof token.image === "string" ? token.image : null;
			session.accessSessionId = accessSessionId;

			return session;
		},
	},
});
