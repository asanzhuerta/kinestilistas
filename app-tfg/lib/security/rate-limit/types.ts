// -----------------------------------------------------------------------------
// TIPOS COMPARTIDOS DEL SISTEMA DE RATE LIMIT
// -----------------------------------------------------------------------------
export type RateLimitScope = "ip" | "user_or_ip" | "email_or_ip";

export type RateLimitPolicyName =
	| "DEFAULT_API"
	| "AUTH_API"
	| "REGISTER_REQUEST"
	| "ADMIN_GENERIC_READ"
	| "ADMIN_GENERIC_WRITE"
	| "ADMIN_USERS_READ"
	| "ADMIN_USERS_WRITE"
	| "PROFILE_IMAGE_UPLOAD"
	| "LOGIN_IP"
	| "LOGIN_IDENTIFIER";

export type RateLimitPolicy = {
	name: RateLimitPolicyName;
	keyPrefix: string;
	maxRequests: number;
	windowMs: number;
	scope: RateLimitScope;
	message: string;
	enabled?: boolean;
};

export type RateLimitPolicyOverride = {
	enabled?: boolean;
	maxRequests?: number;
	windowMs?: number;
};

export type RateLimitPolicyDescriptor = {
	title: string;
	description: string;
};

export type RateLimitIdentityContext = {
	ipAddress: string | null;
	userId?: string | null;
	email?: string | null;
};

export type RateLimitResult = {
	success: boolean;
	limit: number;
	remaining: number;
	resetAt: number;
};
