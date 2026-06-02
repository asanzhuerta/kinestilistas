import { consumeRateLimit } from "./store";
import { type RateLimitPolicy } from "./types";

// -----------------------------------------------------------------------------
// APLICACIÓN DEL RATE LIMIT
// -----------------------------------------------------------------------------
// Construye una clave compuesta por:
//
// - el prefijo lógico de la política
// - la identidad sobre la que limitamos
//
// y consume una unidad de esa cuota.
export function applyRateLimit(policy: RateLimitPolicy, identifier: string) {
	if (policy.enabled === false) {
		return {
			success: true,
			limit: policy.maxRequests,
			remaining: policy.maxRequests,
			resetAt: Date.now() + policy.windowMs,
		};
	}

	const key = `${policy.keyPrefix}:${identifier}`;

	return consumeRateLimit(key, policy.maxRequests, policy.windowMs);
}
