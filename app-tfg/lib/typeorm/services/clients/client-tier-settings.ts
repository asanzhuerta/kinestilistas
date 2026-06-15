import type { EntityManager } from "typeorm";
import type {
	ClientTierRecalculationResult,
	ClientTierPolicySettings,
	ClientTierRecalculationFrequency,
	UpdateClientTierPolicySettingsBody,
} from "@/lib/contracts/client-tier-settings";
import { ORDER_STATUS_IDS } from "@/lib/typeorm/constants/catalog-ids";
import { getDataSource } from "@/lib/typeorm/data-source";
import { Client } from "@/lib/typeorm/entities/Client";
import { ClientCustomerSegment } from "@/lib/typeorm/entities/ClientCustomerSegment";
import { CustomerSegment } from "@/lib/typeorm/entities/CustomerSegment";
import { Order } from "@/lib/typeorm/entities/Order";
import { SystemConfiguration } from "@/lib/typeorm/entities/SystemConfiguration";

type TierCode = "silver" | "gold" | "platinum";

const CONFIG_KEYS = {
	thresholdSilver: "client_tiers.threshold.silver",
	thresholdGold: "client_tiers.threshold.gold",
	thresholdPlatinum: "client_tiers.threshold.platinum",
	recalculationFrequency: "client_tiers.recalculation.frequency",
	recalculationMonth: "client_tiers.recalculation.month",
	recalculationDay: "client_tiers.recalculation.day",
} as const;

const DEFAULT_CLIENT_TIER_POLICY: ClientTierPolicySettings = {
	thresholdSilver: "0.00",
	thresholdGold: "1000.00",
	thresholdPlatinum: "2500.00",
	recalculationFrequency: "annual",
	recalculationMonth: 12,
	recalculationDay: 31,
};

const CONFIG_DESCRIPTIONS: Record<keyof typeof CONFIG_KEYS, string> = {
	thresholdSilver: "Compra acumulada mínima para rango Plata.",
	thresholdGold: "Compra acumulada mínima para rango Oro.",
	thresholdPlatinum: "Compra acumulada mínima para rango Platino.",
	recalculationFrequency: "Frecuencia de actualización automática de rangos.",
	recalculationMonth: "Mes programado para recalcular rangos anualmente.",
	recalculationDay: "Dia programado para recalcular rangos.",
};

const VALID_FREQUENCIES = new Set<ClientTierRecalculationFrequency>([
	"annual",
	"monthly",
]);

const TIER_SEGMENT_DEFINITIONS: Record<
	TierCode,
	Pick<CustomerSegment, "code" | "name" | "description" | "criteria">
> = {
	silver: {
		code: "silver",
		name: "Plata",
		description: "Clientes activos con seguimiento comercial ordinario.",
		criteria: "Rango comercial asignado según compra acumulada.",
	},
	gold: {
		code: "gold",
		name: "Oro",
		description: "Clientes con compra acumulada suficiente para rango Oro.",
		criteria: "Rango comercial asignado según compra acumulada.",
	},
	platinum: {
		code: "platinum",
		name: "Platino",
		description: "Clientes con compra acumulada suficiente para rango Platino.",
		criteria: "Rango comercial asignado según compra acumulada.",
	},
};

const TIER_CODES = Object.keys(TIER_SEGMENT_DEFINITIONS) as TierCode[];
const ORDER_STATUS_IDS_FOR_TIER_RECALCULATION = [
	ORDER_STATUS_IDS.CREATED,
	ORDER_STATUS_IDS.CONFIRMED,
	ORDER_STATUS_IDS.DELIVERED,
];

export class ClientTierSettingsError extends Error {
	status: number;
	code: string;

	constructor(message: string, status = 400, code = "CLIENT_TIER_SETTINGS_ERROR") {
		super(message);
		this.name = "ClientTierSettingsError";
		this.status = status;
		this.code = code;
	}
}

function parseMoneyToCents(value: string | number | null | undefined) {
	const parsed = Number(String(value ?? "").trim().replace(",", "."));

	if (!Number.isFinite(parsed) || parsed < 0) {
		return null;
	}

	return Math.round(parsed * 100);
}

function formatCents(value: number) {
	return (Math.max(0, value) / 100).toFixed(2);
}

function toIsoDate(value: Date) {
	return value.toISOString().slice(0, 10);
}

function normalizeThreshold(
	value: string | number | null | undefined,
	fieldName: string,
) {
	const cents = parseMoneyToCents(value);

	if (cents === null) {
		throw new ClientTierSettingsError(
			`${fieldName} debe ser un importe válido mayor o igual que cero`,
			400,
			"CLIENT_TIER_THRESHOLD_INVALID",
		);
	}

	return formatCents(cents);
}

function normalizeFrequency(
	value: string | null | undefined,
): ClientTierRecalculationFrequency {
	const normalized = String(value ?? "").trim();

	if (!VALID_FREQUENCIES.has(normalized as ClientTierRecalculationFrequency)) {
		throw new ClientTierSettingsError(
			"La frecuencia de actualización de rangos no es válida",
			400,
			"CLIENT_TIER_FREQUENCY_INVALID",
		);
	}

	return normalized as ClientTierRecalculationFrequency;
}

function normalizeIntegerInRange(
	value: string | number | null | undefined,
	fieldName: string,
	min: number,
	max: number,
) {
	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
		throw new ClientTierSettingsError(
			`${fieldName} debe estar entre ${min} y ${max}`,
			400,
			"CLIENT_TIER_DATE_FIELD_INVALID",
		);
	}

	return parsed;
}

async function getConfigurationRepository(manager?: EntityManager) {
	if (manager) {
		return manager.getRepository(SystemConfiguration);
	}

	const dataSource = await getDataSource();
	return dataSource.getRepository(SystemConfiguration);
}

function assertThresholdOrder(settings: ClientTierPolicySettings) {
	const silverCents = parseMoneyToCents(settings.thresholdSilver) ?? 0;
	const goldCents = parseMoneyToCents(settings.thresholdGold) ?? 0;
	const platinumCents = parseMoneyToCents(settings.thresholdPlatinum) ?? 0;

	if (silverCents > goldCents || goldCents > platinumCents) {
		throw new ClientTierSettingsError(
			"Los umbrales deben respetar el orden Plata, Oro y Platino",
			400,
			"CLIENT_TIER_THRESHOLDS_OUT_OF_ORDER",
		);
	}
}

function getPolicyPeriod(settings: ClientTierPolicySettings, now = new Date()) {
	if (settings.recalculationFrequency === "monthly") {
		const start = new Date(now.getFullYear(), now.getMonth(), 1);
		const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);

		return { start, end };
	}

	const start = new Date(now.getFullYear(), 0, 1);
	const end = new Date(now.getFullYear() + 1, 0, 1);

	return { start, end };
}

function resolveTierForPurchaseTotal(
	totalCents: number,
	settings: ClientTierPolicySettings,
): TierCode | "none" {
	const silverCents = parseMoneyToCents(settings.thresholdSilver) ?? 0;
	const goldCents = parseMoneyToCents(settings.thresholdGold) ?? 0;
	const platinumCents = parseMoneyToCents(settings.thresholdPlatinum) ?? 0;

	if (totalCents >= platinumCents) {
		return "platinum";
	}

	if (totalCents >= goldCents) {
		return "gold";
	}

	if (totalCents >= silverCents) {
		return "silver";
	}

	return "none";
}

async function ensureTierSegments(manager: EntityManager) {
	const repository = manager.getRepository(CustomerSegment);
	const existingSegments = await repository
		.createQueryBuilder("segment")
		.where("LOWER(segment.code) IN (:...tierCodes)", { tierCodes: TIER_CODES })
		.getMany();
	const segmentsByCode = new Map(
		existingSegments.map((segment) => [segment.code.toLowerCase(), segment]),
	);

	for (const tierCode of TIER_CODES) {
		if (!segmentsByCode.has(tierCode)) {
			const createdSegment = await repository.save(
				repository.create(TIER_SEGMENT_DEFINITIONS[tierCode]),
			);
			segmentsByCode.set(tierCode, createdSegment);
		}
	}

	return segmentsByCode as Map<TierCode, CustomerSegment>;
}

function parseStoredMoneyToCents(value: string | number | null | undefined) {
	const parsed = Number(String(value ?? "0").replace(",", "."));

	return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export async function getClientTierPolicySettings(
	manager?: EntityManager,
): Promise<ClientTierPolicySettings> {
	const repository = await getConfigurationRepository(manager);
	const configurations = await repository.find({
		where: Object.values(CONFIG_KEYS).map((key) => ({ key })),
	});
	const configMap = new Map(
		configurations.map((configuration) => [configuration.key, configuration.value]),
	);

	return {
		thresholdSilver: normalizeThreshold(
			configMap.get(CONFIG_KEYS.thresholdSilver) ??
				DEFAULT_CLIENT_TIER_POLICY.thresholdSilver,
			"El umbral Plata",
		),
		thresholdGold: normalizeThreshold(
			configMap.get(CONFIG_KEYS.thresholdGold) ??
				DEFAULT_CLIENT_TIER_POLICY.thresholdGold,
			"El umbral Oro",
		),
		thresholdPlatinum: normalizeThreshold(
			configMap.get(CONFIG_KEYS.thresholdPlatinum) ??
				DEFAULT_CLIENT_TIER_POLICY.thresholdPlatinum,
			"El umbral Platino",
		),
		recalculationFrequency: normalizeFrequency(
			configMap.get(CONFIG_KEYS.recalculationFrequency) ??
				DEFAULT_CLIENT_TIER_POLICY.recalculationFrequency,
		),
		recalculationMonth: normalizeIntegerInRange(
			configMap.get(CONFIG_KEYS.recalculationMonth) ??
				DEFAULT_CLIENT_TIER_POLICY.recalculationMonth,
			"El mes de recálculo",
			1,
			12,
		),
		recalculationDay: normalizeIntegerInRange(
			configMap.get(CONFIG_KEYS.recalculationDay) ??
				DEFAULT_CLIENT_TIER_POLICY.recalculationDay,
			"El día de recálculo",
			1,
			31,
		),
	};
}

export async function updateClientTierPolicySettings(
	input: UpdateClientTierPolicySettingsBody,
) {
	const currentSettings = await getClientTierPolicySettings();
	const nextSettings: ClientTierPolicySettings = {
		thresholdSilver:
			input.thresholdSilver !== undefined
				? normalizeThreshold(input.thresholdSilver, "El umbral Plata")
				: currentSettings.thresholdSilver,
		thresholdGold:
			input.thresholdGold !== undefined
				? normalizeThreshold(input.thresholdGold, "El umbral Oro")
				: currentSettings.thresholdGold,
		thresholdPlatinum:
			input.thresholdPlatinum !== undefined
				? normalizeThreshold(input.thresholdPlatinum, "El umbral Platino")
				: currentSettings.thresholdPlatinum,
		recalculationFrequency:
			input.recalculationFrequency !== undefined
				? normalizeFrequency(String(input.recalculationFrequency ?? ""))
				: currentSettings.recalculationFrequency,
		recalculationMonth:
			input.recalculationMonth !== undefined
				? normalizeIntegerInRange(
						input.recalculationMonth,
						"El mes de recálculo",
						1,
						12,
					)
				: currentSettings.recalculationMonth,
		recalculationDay:
			input.recalculationDay !== undefined
				? normalizeIntegerInRange(
						input.recalculationDay,
						"El día de recálculo",
						1,
						31,
					)
				: currentSettings.recalculationDay,
	};

	assertThresholdOrder(nextSettings);

	const repository = await getConfigurationRepository();
	await repository.upsert(
		[
			{
				key: CONFIG_KEYS.thresholdSilver,
				value: nextSettings.thresholdSilver,
				description: CONFIG_DESCRIPTIONS.thresholdSilver,
			},
			{
				key: CONFIG_KEYS.thresholdGold,
				value: nextSettings.thresholdGold,
				description: CONFIG_DESCRIPTIONS.thresholdGold,
			},
			{
				key: CONFIG_KEYS.thresholdPlatinum,
				value: nextSettings.thresholdPlatinum,
				description: CONFIG_DESCRIPTIONS.thresholdPlatinum,
			},
			{
				key: CONFIG_KEYS.recalculationFrequency,
				value: nextSettings.recalculationFrequency,
				description: CONFIG_DESCRIPTIONS.recalculationFrequency,
			},
			{
				key: CONFIG_KEYS.recalculationMonth,
				value: String(nextSettings.recalculationMonth),
				description: CONFIG_DESCRIPTIONS.recalculationMonth,
			},
			{
				key: CONFIG_KEYS.recalculationDay,
				value: String(nextSettings.recalculationDay),
				description: CONFIG_DESCRIPTIONS.recalculationDay,
			},
		],
		["key"],
	);

	return getClientTierPolicySettings();
}

export async function recalculateClientTiersByPolicy(
	actedByUserId: string | null,
): Promise<ClientTierRecalculationResult> {
	const dataSource = await getDataSource();

	return dataSource.transaction(async (manager) => {
		const settings = await getClientTierPolicySettings(manager);
		assertThresholdOrder(settings);

		const period = getPolicyPeriod(settings);
		const clients = await manager.getRepository(Client).find({
			select: {
				id: true,
			},
		});
		const purchaseRows = await manager
			.getRepository(Order)
			.createQueryBuilder("order")
			.select("order.client_id", "clientId")
			.addSelect("COALESCE(SUM(order.total_amount), 0)", "totalAmount")
			.where("order.created_at >= :periodStart", { periodStart: period.start })
			.andWhere("order.created_at < :periodEnd", { periodEnd: period.end })
			.andWhere("order.status_id IN (:...statusIds)", {
				statusIds: ORDER_STATUS_IDS_FOR_TIER_RECALCULATION,
			})
			.groupBy("order.client_id")
			.getRawMany<{ clientId: string; totalAmount: string }>();
		const totalsByClientId = new Map(
			purchaseRows.map((row) => [
				row.clientId,
				parseStoredMoneyToCents(row.totalAmount),
			]),
		);
		const segmentsByCode = await ensureTierSegments(manager);
		const assignmentRepository = manager.getRepository(ClientCustomerSegment);
		const assigned = {
			silver: 0,
			gold: 0,
			platinum: 0,
			none: 0,
		};
		let updatedClients = 0;

		for (const client of clients) {
			const totalCents = totalsByClientId.get(client.id) ?? 0;
			const nextTierCode = resolveTierForPurchaseTotal(totalCents, settings);
			const currentTierAssignments = await assignmentRepository
				.createQueryBuilder("assignment")
				.innerJoinAndSelect("assignment.segment", "segment")
				.where("assignment.client_id = :clientId", { clientId: client.id })
				.andWhere("LOWER(segment.code) IN (:...tierCodes)", {
					tierCodes: TIER_CODES,
				})
				.getMany();
			const currentTierCodes = currentTierAssignments.map((assignment) =>
				assignment.segment.code.toLowerCase(),
			);
			const alreadySynced =
				nextTierCode === "none"
					? currentTierAssignments.length === 0
					: currentTierAssignments.length === 1 &&
						currentTierCodes[0] === nextTierCode;

			assigned[nextTierCode] += 1;

			if (alreadySynced) {
				continue;
			}

			if (currentTierAssignments.length > 0) {
				await assignmentRepository.remove(currentTierAssignments);
			}

			if (nextTierCode !== "none") {
				const segment = segmentsByCode.get(nextTierCode);

				if (segment) {
					await assignmentRepository.save(
						assignmentRepository.create({
							client_id: client.id,
							segment_id: segment.id,
							assigned_by_user_id: actedByUserId,
							notes: `Recálculo automático por compra acumulada ${formatCents(totalCents)} € (${toIsoDate(period.start)} - ${toIsoDate(period.end)}).`,
						}),
					);
				}
			}

			updatedClients += 1;
		}

		return {
			periodStart: period.start.toISOString(),
			periodEnd: period.end.toISOString(),
			frequency: settings.recalculationFrequency,
			processedClients: clients.length,
			updatedClients,
			assigned,
		};
	});
}
