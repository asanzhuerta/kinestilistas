import { type RateLimitResult } from "./types";

// -----------------------------------------------------------------------------
// ALMACÉN EN MEMORIA PARA RATE LIMIT
// -----------------------------------------------------------------------------
// Este sistema guarda los contadores en memoria del proceso Node actual.
// Ventajas:
//
// - no necesita servicios externos
// - no necesita paquetes adicionales
// - es muy sencillo de integrar
//
// Limitaciones:
//
// - se reinicia al reiniciar el servidor
// - no comparte estado entre varias instancias o procesos
// - está pensado para entornos simples o un único servidor
type MemoryRateLimitEntry = {
	count: number;
	resetAt: number;
};

type MemoryRateLimitStore = Map<string, MemoryRateLimitEntry>;

declare global {
	var __kinestilistasRateLimitStore: MemoryRateLimitStore | undefined;

	var __kinestilistasRateLimitCounter: number | undefined;
}

function getMemoryStore() {
	if (!globalThis.__kinestilistasRateLimitStore) {
		globalThis.__kinestilistasRateLimitStore = new Map();
	}

	return globalThis.__kinestilistasRateLimitStore;
}

function incrementInternalCounter() {
	globalThis.__kinestilistasRateLimitCounter =
		(globalThis.__kinestilistasRateLimitCounter ?? 0) + 1;

	return globalThis.__kinestilistasRateLimitCounter;
}

// Limpieza oportunista para evitar que el Map crezca indefinidamente.
// No hace falta ejecutarla en cada request: con hacerla de vez en cuando basta.
function pruneExpiredEntries(store: MemoryRateLimitStore) {
	const now = Date.now();

	for (const [key, entry] of store.entries()) {
		if (entry.resetAt <= now) {
			store.delete(key);
		}
	}
}

// Consume una unidad del contador asociado a una clave.
// Implementa una ventana fija simple:
// - si la ventana expiró, se reinicia
// - si no expiró, se incrementa
// - si se supera el límite, se bloquea
export function consumeRateLimit(
	key: string,
	maxRequests: number,
	windowMs: number,
): RateLimitResult {
	const store = getMemoryStore();
	const now = Date.now();

	// Cada cierto número de accesos, hacemos limpieza de claves expiradas.
	if (incrementInternalCounter() % 100 === 0) {
		pruneExpiredEntries(store);
	}

	const currentEntry = store.get(key);

	if (!currentEntry || currentEntry.resetAt <= now) {
		const resetAt = now + windowMs;

		store.set(key, {
			count: 1,
			resetAt,
		});

		return {
			success: true,
			limit: maxRequests,
			remaining: Math.max(maxRequests - 1, 0),
			resetAt,
		};
	}

	if (currentEntry.count >= maxRequests) {
		return {
			success: false,
			limit: maxRequests,
			remaining: 0,
			resetAt: currentEntry.resetAt,
		};
	}

	currentEntry.count += 1;
	store.set(key, currentEntry);

	return {
		success: true,
		limit: maxRequests,
		remaining: Math.max(maxRequests - currentEntry.count, 0),
		resetAt: currentEntry.resetAt,
	};
}
