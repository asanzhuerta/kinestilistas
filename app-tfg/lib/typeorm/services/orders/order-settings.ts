import type { EntityManager } from "typeorm";
import type {
	OrderBusinessSettings,
	UpdateOrderBusinessSettingsBody,
} from "@/lib/contracts/order-settings";
import { getDataSource } from "@/lib/typeorm/data-source";
import { SystemConfiguration } from "@/lib/typeorm/entities/SystemConfiguration";

const AGENCY_DELIVERY_FEE_CONFIGURATION_KEY = "orders.agency_delivery_fee";
const AGENCY_DELIVERY_FEE_CONFIGURATION_DESCRIPTION =
	"Cargo aplicado a pedidos entregados por agencia.";
const DEFAULT_AGENCY_DELIVERY_FEE = "8.00";

export class OrderSettingsError extends Error {
	status: number;
	code: string;

	constructor(message: string, status = 400, code = "ORDER_SETTINGS_ERROR") {
		super(message);
		this.name = "OrderSettingsError";
		this.status = status;
		this.code = code;
	}
}

function parseMoneyToCents(value: string | number | null | undefined) {
	const parsed = Number(value ?? 0);

	if (!Number.isFinite(parsed) || parsed < 0) {
		return null;
	}

	return Math.round(parsed * 100);
}

function formatCents(value: number) {
	return (Math.max(0, value) / 100).toFixed(2);
}

function normalizeFee(value: string | number | null | undefined) {
	const cents = parseMoneyToCents(value);

	if (cents === null) {
		throw new OrderSettingsError(
			"El cargo por agencia debe ser un importe valido mayor o igual que cero",
			400,
			"ORDER_AGENCY_FEE_INVALID",
		);
	}

	return formatCents(cents);
}

async function getConfigurationRepository(manager?: EntityManager) {
	if (manager) {
		return manager.getRepository(SystemConfiguration);
	}

	const dataSource = await getDataSource();
	return dataSource.getRepository(SystemConfiguration);
}

export async function getOrderBusinessSettings(
	manager?: EntityManager,
): Promise<OrderBusinessSettings> {
	const repository = await getConfigurationRepository(manager);
	const configuration = await repository.findOne({
		where: {
			key: AGENCY_DELIVERY_FEE_CONFIGURATION_KEY,
		},
	});

	return {
		agencyDeliveryFee: normalizeFee(
			configuration?.value ?? DEFAULT_AGENCY_DELIVERY_FEE,
		),
	};
}

export async function getAgencyDeliveryFeeCents(manager?: EntityManager) {
	const settings = await getOrderBusinessSettings(manager);
	const cents = parseMoneyToCents(settings.agencyDeliveryFee);

	return cents ?? 0;
}

export async function updateOrderBusinessSettings(
	input: UpdateOrderBusinessSettingsBody,
) {
	const nextAgencyDeliveryFee = normalizeFee(input.agencyDeliveryFee);
	const repository = await getConfigurationRepository();

	await repository.upsert(
		{
			key: AGENCY_DELIVERY_FEE_CONFIGURATION_KEY,
			value: nextAgencyDeliveryFee,
			description: AGENCY_DELIVERY_FEE_CONFIGURATION_DESCRIPTION,
		},
		["key"],
	);

	return getOrderBusinessSettings();
}
