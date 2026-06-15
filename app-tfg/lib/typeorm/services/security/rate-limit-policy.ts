import {
	getRateLimitPolicy,
	getRateLimitPolicyOverrides,
	RATE_LIMIT_POLICIES,
	RATE_LIMIT_POLICY_DESCRIPTORS,
	setRateLimitPolicyOverrides,
	type RateLimitPolicyName,
	type RateLimitPolicyOverride,
} from "@/lib/security/rate-limit";
import type { RateLimitPolicySettingsItem } from "@/lib/contracts/rate-limit-settings";
import { getDataSource } from "@/lib/typeorm/data-source";
import { AppRateLimitPolicy } from "@/lib/typeorm/entities/AppRateLimitPolicy";

type RateLimitPolicyOverrideMap = Partial<
	Record<RateLimitPolicyName, RateLimitPolicyOverride>
>;

type UpdateRateLimitPolicySettingsInput = {
	policies: Array<{
		name?: string;
		enabled?: boolean;
		maxRequests?: number | string | null;
		windowMinutes?: number | string | null;
	}>;
};

declare global {
	var __kinestilistasRateLimitPolicyOverridesHydratedAt: number | undefined;
}

const HYDRATE_CACHE_TTL_MS = 30_000;
const APP_RATE_LIMIT_POLICIES_TABLE = "public.app_rate_limit_policies";

export class RateLimitPolicySettingsError extends Error {
	status: number;
	code: string;

	constructor(
		message: string,
		status = 400,
		code = "RATE_LIMIT_POLICY_SETTINGS_ERROR",
	) {
		super(message);
		this.name = "RateLimitPolicySettingsError";
		this.status = status;
		this.code = code;
	}
}

function isValidRateLimitPolicyName(
	value: string | null | undefined,
): value is RateLimitPolicyName {
	return (
		typeof value === "string" &&
		Object.prototype.hasOwnProperty.call(RATE_LIMIT_POLICIES, value)
	);
}

function parsePositiveInteger(
	value: number | string | null | undefined,
	fieldName: string,
	code: string,
) {
	const normalizedValue =
		typeof value === "string" ? Number(value.trim()) : Number(value);

	if (!Number.isInteger(normalizedValue) || normalizedValue <= 0) {
		throw new RateLimitPolicySettingsError(
			`${fieldName} debe ser un entero positivo`,
			400,
			code,
		);
	}

	return normalizedValue;
}

async function hasRateLimitPoliciesTable() {
	const dataSource = await getDataSource();
	const result = (await dataSource.query(
		`SELECT to_regclass($1) AS table_name`,
		[APP_RATE_LIMIT_POLICIES_TABLE],
	)) as Array<{ table_name?: string | null }>;

	return Boolean(result[0]?.table_name);
}

function buildOverrideMapFromRows(rows: AppRateLimitPolicy[]) {
	return rows.reduce<RateLimitPolicyOverrideMap>((accumulator, row) => {
		if (!isValidRateLimitPolicyName(row.policy_name)) {
			return accumulator;
		}

		accumulator[row.policy_name] = {
			enabled: Boolean(row.enabled),
			maxRequests: row.max_requests,
			windowMs: row.window_ms,
		};

		return accumulator;
	}, {});
}

function buildPolicySettingsItem(
	name: RateLimitPolicyName,
): RateLimitPolicySettingsItem {
	const defaults = RATE_LIMIT_POLICIES[name];
	const configuredPolicy = getRateLimitPolicy(name);
	const descriptor = RATE_LIMIT_POLICY_DESCRIPTORS[name];

	return {
		name,
		title: descriptor.title,
		description: descriptor.description,
		scope: configuredPolicy.scope,
		enabled: configuredPolicy.enabled !== false,
		maxRequests: configuredPolicy.maxRequests,
		windowMs: configuredPolicy.windowMs,
		windowMinutes: Number((configuredPolicy.windowMs / 60_000).toFixed(2)),
		defaultEnabled: true,
		defaultMaxRequests: defaults.maxRequests,
		defaultWindowMs: defaults.windowMs,
		defaultWindowMinutes: Number((defaults.windowMs / 60_000).toFixed(2)),
		message: configuredPolicy.message,
		isDefault:
			(configuredPolicy.enabled ?? true) === true &&
			configuredPolicy.maxRequests === defaults.maxRequests &&
			configuredPolicy.windowMs === defaults.windowMs,
	};
}

export async function hydrateRateLimitPolicyOverrides(force = false) {
	const now = Date.now();
	const lastHydratedAt =
		globalThis.__kinestilistasRateLimitPolicyOverridesHydratedAt ?? 0;

	if (
		!force &&
		lastHydratedAt > 0 &&
		now - lastHydratedAt < HYDRATE_CACHE_TTL_MS
	) {
		return getRateLimitPolicyOverrides();
	}

	try {
		if (!(await hasRateLimitPoliciesTable())) {
			setRateLimitPolicyOverrides({});
			globalThis.__kinestilistasRateLimitPolicyOverridesHydratedAt = now;
			return {};
		}

		const dataSource = await getDataSource();
		const rows = await dataSource
			.getRepository(AppRateLimitPolicy)
			.find();
		const overrides = buildOverrideMapFromRows(rows);

		setRateLimitPolicyOverrides(overrides);
		globalThis.__kinestilistasRateLimitPolicyOverridesHydratedAt = now;
		return overrides;
	} catch (error) {
		console.error(
			"[rate-limit][settings] no se pudieron hidratar los overrides:",
			error,
		);

		return getRateLimitPolicyOverrides();
	}
}

export async function listRateLimitPolicySettings() {
	await hydrateRateLimitPolicyOverrides();

	return (Object.keys(RATE_LIMIT_POLICIES) as RateLimitPolicyName[]).map(
		(name) => buildPolicySettingsItem(name),
	);
}

export async function updateRateLimitPolicySettings(
	input: UpdateRateLimitPolicySettingsInput,
) {
	if (!Array.isArray(input.policies) || input.policies.length === 0) {
		throw new RateLimitPolicySettingsError(
			"No se ha recibido ninguna política para guardar",
			400,
			"RATE_LIMIT_POLICIES_REQUIRED",
		);
	}

	if (!(await hasRateLimitPoliciesTable())) {
		throw new RateLimitPolicySettingsError(
			"No existe la tabla de configuración de límites de peticiones. Ejecuta la migración pendiente y vuelve a intentarlo.",
			500,
			"RATE_LIMIT_SETTINGS_TABLE_MISSING",
		);
	}

	const normalizedPolicies = input.policies.map((policyInput) => {
		if (!isValidRateLimitPolicyName(policyInput.name)) {
			throw new RateLimitPolicySettingsError(
				"Se ha recibido una política de límites de peticiones no válida",
				400,
				"RATE_LIMIT_POLICY_INVALID_NAME",
			);
		}

		return {
			name: policyInput.name,
			enabled:
				typeof policyInput.enabled === "boolean" ? policyInput.enabled : true,
			maxRequests: parsePositiveInteger(
				policyInput.maxRequests,
				"maxRequests",
				"RATE_LIMIT_POLICY_INVALID_MAX_REQUESTS",
			),
			windowMs:
				parsePositiveInteger(
					policyInput.windowMinutes,
					"windowMinutes",
					"RATE_LIMIT_POLICY_INVALID_WINDOW_MINUTES",
				) * 60_000,
		};
	});

	const dataSource = await getDataSource();

	await dataSource.transaction(async (manager) => {
		const repository = manager.getRepository(AppRateLimitPolicy);

		for (const policy of normalizedPolicies) {
			const defaults = RATE_LIMIT_POLICIES[policy.name];
			const matchesDefaults =
				policy.enabled === true &&
				policy.maxRequests === defaults.maxRequests &&
				policy.windowMs === defaults.windowMs;

			if (matchesDefaults) {
				await repository.delete({
					policy_name: policy.name,
				});
				continue;
			}

			await repository.upsert(
				{
					policy_name: policy.name,
					enabled: policy.enabled,
					max_requests: policy.maxRequests,
					window_ms: policy.windowMs,
				},
				["policy_name"],
			);
		}
	});

	await hydrateRateLimitPolicyOverrides(true);
	return listRateLimitPolicySettings();
}
