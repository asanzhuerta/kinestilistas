import { getDataSource } from "@/lib/typeorm/data-source";
import { UserAccessLog } from "@/lib/typeorm/entities/UserAccessLog";

type PersistedAccessSessionInput = {
	sessionToken: string;
	userId?: string | null;
};

type PersistedAccessSessionCacheEntry = {
	isActive: boolean;
	expiresAt: number;
};

type PersistedAccessSessionCache = Map<
	string,
	PersistedAccessSessionCacheEntry
>;

declare global {
	var __kinestilistasPersistedAccessSessionCache:
		| PersistedAccessSessionCache
		| undefined;
}

const ACTIVE_SESSION_CACHE_MS = 5_000;
const INACTIVE_SESSION_CACHE_MS = 2_000;

function getPersistedAccessSessionCache() {
	if (!globalThis.__kinestilistasPersistedAccessSessionCache) {
		globalThis.__kinestilistasPersistedAccessSessionCache = new Map();
	}

	return globalThis.__kinestilistasPersistedAccessSessionCache;
}

function buildPersistedAccessSessionCacheKey(
	sessionToken: string,
	userId?: string | null,
) {
	return `${sessionToken}::${String(userId ?? "").trim()}`;
}

function readPersistedAccessSessionCache(
	sessionToken: string,
	userId?: string | null,
) {
	const cache = getPersistedAccessSessionCache();
	const cacheKey = buildPersistedAccessSessionCacheKey(sessionToken, userId);
	const cachedEntry = cache.get(cacheKey);

	if (!cachedEntry) {
		return null;
	}

	if (cachedEntry.expiresAt <= Date.now()) {
		cache.delete(cacheKey);
		return null;
	}

	return cachedEntry;
}

export function cachePersistedAccessSessionState(
	sessionToken: string,
	userId: string | null | undefined,
	isActive: boolean,
) {
	const normalizedSessionToken = String(sessionToken ?? "").trim();

	if (!normalizedSessionToken) {
		return;
	}

	const cache = getPersistedAccessSessionCache();
	cache.set(
		buildPersistedAccessSessionCacheKey(normalizedSessionToken, userId),
		{
			isActive,
			expiresAt:
				Date.now() +
				(isActive ? ACTIVE_SESSION_CACHE_MS : INACTIVE_SESSION_CACHE_MS),
		},
	);
}

export async function isPersistedAccessSessionActive(
	input: PersistedAccessSessionInput,
) {
	const sessionToken = String(input.sessionToken ?? "").trim();

	if (!sessionToken) {
		return false;
	}

	const cachedState = readPersistedAccessSessionCache(
		sessionToken,
		input.userId,
	);

	if (cachedState) {
		return cachedState.isActive;
	}

	try {
		const ds = await getDataSource();
		const accessLogRepo = ds.getRepository(UserAccessLog);
		const query = accessLogRepo
			.createQueryBuilder("log")
			.where("log.session_token = :sessionToken", {
				sessionToken,
			})
			.andWhere("log.revoked_at IS NULL")
			.andWhere("(log.expires_at IS NULL OR log.expires_at > NOW())");

		if (input.userId) {
			query.andWhere("log.user_id = :userId", {
				userId: input.userId,
			});
		}

		const isActiveSession = await query.getExists();
		cachePersistedAccessSessionState(
			sessionToken,
			input.userId,
			isActiveSession,
		);

		return isActiveSession;
	} catch (error) {
		console.error(
			"[auth][session] no se pudo verificar la sesion persistida:",
			error,
		);

		// Ante un fallo transitorio de BD preferimos conservar la sesion actual
		// y reintentar en la siguiente validacion, en lugar de expulsar al usuario.
		return true;
	}
}
