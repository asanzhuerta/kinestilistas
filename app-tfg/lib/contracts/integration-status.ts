export type IntegrationStatusCode =
	| "operational"
	| "degraded"
	| "not_configured";

export type IntegrationConfigurationItem = {
	label: string;
	value: string;
	sensitive?: boolean;
};

export type IntegrationStatusItem = {
	slug: string;
	title: string;
	provider: string;
	category: string;
	status: IntegrationStatusCode;
	statusLabel: string;
	description: string;
	operationalUse: string;
	fallbackBehavior: string;
	configuration: IntegrationConfigurationItem[];
	lastCheckedAt: string;
};

export type IntegrationStatusSummary = {
	total: number;
	operational: number;
	degraded: number;
	notConfigured: number;
	lastCheckedAt: string;
};
