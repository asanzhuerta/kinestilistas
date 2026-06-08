import type { EntityManager } from "typeorm";
import {
	type AutomaticNotificationKey,
	type ExternalNotificationDeliveryChannel,
	type NotificationDeliverySettingsItem,
	type UpdateNotificationDeliverySettingsBody,
} from "@/lib/contracts/notification-settings";
import { getDataSource } from "@/lib/typeorm/data-source";
import { SystemConfiguration } from "@/lib/typeorm/entities/SystemConfiguration";

type NotificationDeliverySettingsMap = Record<
	AutomaticNotificationKey,
	ExternalNotificationDeliveryChannel[]
>;

type NotificationDescriptor = {
	title: string;
	description: string;
	audience: string;
	defaultChannels: ExternalNotificationDeliveryChannel[];
};

const CONFIGURATION_KEY = "notifications.automatic_delivery_channels";
const CONFIGURATION_DESCRIPTION =
	"Canales externos para avisos automáticos. Los avisos internos de la app se mantienen siempre activos.";
const EXTERNAL_CHANNELS = ["email", "push"] as const;

const NOTIFICATION_DESCRIPTORS: Record<
	AutomaticNotificationKey,
	NotificationDescriptor
> = {
	commercial_visit_created: {
		title: "Nueva visita programada",
		description:
			"Avisa al cliente cuando el comercial programa una visita o entrega.",
		audience: "Cliente profesional",
		defaultChannels: ["email", "push"],
	},
	commercial_visit_rescheduled: {
		title: "Visita reubicada",
		description:
			"Avisa al cliente cuando una visita existente cambia de fecha.",
		audience: "Cliente profesional",
		defaultChannels: ["email", "push"],
	},
	commercial_visit_today: {
		title: "Visita pendiente hoy",
		description:
			"Refuerza por la mañana que el cliente tiene una visita prevista ese día.",
		audience: "Cliente profesional",
		defaultChannels: ["push"],
	},
	commercial_visit_auto_postponed: {
		title: "Visitas aplazadas automáticamente",
		description:
			"Avisa al comercial cuando el sistema aplaza visitas fuera de horario.",
		audience: "Comercial",
		defaultChannels: [],
	},
};

const AUTOMATIC_NOTIFICATION_KEYS = Object.keys(
	NOTIFICATION_DESCRIPTORS,
) as AutomaticNotificationKey[];

export class NotificationSettingsError extends Error {
	status: number;
	code: string;

	constructor(
		message: string,
		status = 400,
		code = "NOTIFICATION_SETTINGS_ERROR",
	) {
		super(message);
		this.name = "NotificationSettingsError";
		this.status = status;
		this.code = code;
	}
}

function isAutomaticNotificationKey(
	value: string | null | undefined,
): value is AutomaticNotificationKey {
	return (
		typeof value === "string" &&
		Object.prototype.hasOwnProperty.call(NOTIFICATION_DESCRIPTORS, value)
	);
}

function normalizeExternalChannels(value: unknown) {
	if (!Array.isArray(value)) {
		return [];
	}

	const channels = new Set<ExternalNotificationDeliveryChannel>();

	for (const channel of value) {
		if (
			typeof channel === "string" &&
			EXTERNAL_CHANNELS.includes(
				channel as ExternalNotificationDeliveryChannel,
			)
		) {
			channels.add(channel as ExternalNotificationDeliveryChannel);
		}
	}

	return EXTERNAL_CHANNELS.filter((channel) => channels.has(channel));
}

function buildDefaultSettingsMap(): NotificationDeliverySettingsMap {
	return AUTOMATIC_NOTIFICATION_KEYS.reduce<NotificationDeliverySettingsMap>(
		(accumulator, key) => {
			accumulator[key] = [...NOTIFICATION_DESCRIPTORS[key].defaultChannels];
			return accumulator;
		},
		{} as NotificationDeliverySettingsMap,
	);
}

function normalizeSettingsMap(value: unknown): NotificationDeliverySettingsMap {
	const defaults = buildDefaultSettingsMap();

	if (!value || typeof value !== "object") {
		return defaults;
	}

	return AUTOMATIC_NOTIFICATION_KEYS.reduce<NotificationDeliverySettingsMap>(
		(accumulator, key) => {
			const rawChannels = (value as Record<string, unknown>)[key];
			accumulator[key] = Array.isArray(rawChannels)
				? normalizeExternalChannels(rawChannels)
				: defaults[key];
			return accumulator;
		},
		{} as NotificationDeliverySettingsMap,
	);
}

function parseStoredSettings(value: string | null | undefined) {
	if (!value) {
		return buildDefaultSettingsMap();
	}

	try {
		return normalizeSettingsMap(JSON.parse(value));
	} catch {
		return buildDefaultSettingsMap();
	}
}

function mapsAreEqual(
	left: NotificationDeliverySettingsMap,
	right: NotificationDeliverySettingsMap,
) {
	return AUTOMATIC_NOTIFICATION_KEYS.every((key) => {
		const leftChannels = left[key];
		const rightChannels = right[key];

		return (
			leftChannels.length === rightChannels.length &&
			leftChannels.every((channel, index) => channel === rightChannels[index])
		);
	});
}

async function getConfigurationRepository(manager?: EntityManager) {
	if (manager) {
		return manager.getRepository(SystemConfiguration);
	}

	const dataSource = await getDataSource();
	return dataSource.getRepository(SystemConfiguration);
}

async function getStoredSettingsMap(manager?: EntityManager) {
	const repository = await getConfigurationRepository(manager);
	const configuration = await repository.findOne({
		where: {
			key: CONFIGURATION_KEY,
		},
	});

	return parseStoredSettings(configuration?.value);
}

function mapSettingsItem(
	key: AutomaticNotificationKey,
	settings: NotificationDeliverySettingsMap,
): NotificationDeliverySettingsItem {
	const descriptor = NOTIFICATION_DESCRIPTORS[key];

	return {
		key,
		title: descriptor.title,
		description: descriptor.description,
		audience: descriptor.audience,
		channels: settings[key],
		defaultChannels: descriptor.defaultChannels,
		isDefault: mapsAreEqual(
			{ ...buildDefaultSettingsMap(), [key]: settings[key] },
			buildDefaultSettingsMap(),
		),
	};
}

export async function listNotificationDeliverySettings() {
	const settings = await getStoredSettingsMap();

	return AUTOMATIC_NOTIFICATION_KEYS.map((key) =>
		mapSettingsItem(key, settings),
	);
}

export async function getAutomaticNotificationDeliveryChannels(
	key: AutomaticNotificationKey,
	manager?: EntityManager,
) {
	const settings = await getStoredSettingsMap(manager);
	return settings[key];
}

export function hasExternalNotificationChannels(
	channels: ExternalNotificationDeliveryChannel[],
) {
	return channels.length > 0;
}

export async function updateNotificationDeliverySettings(
	input: UpdateNotificationDeliverySettingsBody,
) {
	if (!Array.isArray(input.events) || input.events.length === 0) {
		throw new NotificationSettingsError(
			"No se ha recibido ningún aviso automático para guardar",
			400,
			"NOTIFICATION_SETTINGS_REQUIRED",
		);
	}

	const currentSettings = await getStoredSettingsMap();
	const nextSettings: NotificationDeliverySettingsMap = {
		...currentSettings,
	};

	for (const event of input.events) {
		if (!isAutomaticNotificationKey(event.key)) {
			throw new NotificationSettingsError(
				"Se ha recibido un tipo de aviso automático no válido",
				400,
				"NOTIFICATION_SETTINGS_INVALID_EVENT",
			);
		}

		nextSettings[event.key] = normalizeExternalChannels(event.channels);
	}

	const repository = await getConfigurationRepository();
	await repository.upsert(
		{
			key: CONFIGURATION_KEY,
			value: JSON.stringify(nextSettings),
			description: CONFIGURATION_DESCRIPTION,
		},
		["key"],
	);

	return listNotificationDeliverySettings();
}
