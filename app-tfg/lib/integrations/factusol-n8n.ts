import type {
	ExternalIntegrationStatus,
	ExternalIntegrationType,
} from "@/lib/typeorm/entities/ExternalIntegration";

export const FACTUSOL_N8N_INTEGRATION_NAME = "Factusol mediante n8n";
export const FACTUSOL_N8N_INTEGRATION_TYPE =
	"erp" satisfies ExternalIntegrationType;
export const FACTUSOL_N8N_INITIAL_STATUS =
	"not_configured" satisfies ExternalIntegrationStatus;

export const FACTUSOL_N8N_DATA_TYPES = {
	orders: "orders",
	deliveryNotes: "delivery_notes",
	invoices: "invoices",
	payments: "payments",
} as const;

export type FactusolN8nDataType =
	(typeof FACTUSOL_N8N_DATA_TYPES)[keyof typeof FACTUSOL_N8N_DATA_TYPES];

export type FactusolN8nBaseConfig = {
	orchestrator: "n8n";
	target: "Factusol";
	mode: "pending_credentials" | "configured";
	version: 1;
};

export function buildFactusolN8nBaseConfig(
	mode: FactusolN8nBaseConfig["mode"] = "pending_credentials",
): FactusolN8nBaseConfig {
	return {
		orchestrator: "n8n",
		target: "Factusol",
		mode,
		version: 1,
	};
}

export function isFactusolN8nIntegrationName(
	value: string | null | undefined,
) {
	return value === FACTUSOL_N8N_INTEGRATION_NAME;
}
