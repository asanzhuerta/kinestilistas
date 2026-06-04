export type AdminOperationalStatusCode = "ready" | "warning" | "attention";

export type AdminOperationalMetric = {
	label: string;
	value: string;
	helper?: string;
};

export type AdminOperationalSection = {
	slug: string;
	title: string;
	href: string;
	status: AdminOperationalStatusCode;
	statusLabel: string;
	description: string;
	metrics: AdminOperationalMetric[];
	lastCheckedAt: string;
};

export type AdminOperationalOverviewSummary = {
	total: number;
	ready: number;
	warning: number;
	attention: number;
	lastCheckedAt: string;
};

export type AdminOperationalOverview = {
	summary: AdminOperationalOverviewSummary;
	sections: AdminOperationalSection[];
};
