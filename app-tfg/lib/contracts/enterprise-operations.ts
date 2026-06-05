import type {
	ExternalIntegrationStatus,
	ExternalIntegrationType,
} from "@/lib/typeorm/entities/ExternalIntegration";
import type {
	IntegrationOperationStatus,
	IntegrationOperationType,
} from "@/lib/typeorm/entities/IntegrationOperation";
import type { SupplierOrderProposalStatus } from "@/lib/typeorm/entities/SupplierOrderProposal";

export type SystemConfigurationItem = {
	id: string;
	key: string;
	value: string;
	description: string | null;
	createdAt: string;
	updatedAt: string;
};

export type ExternalIntegrationItem = {
	id: string;
	name: string;
	integrationType: ExternalIntegrationType;
	integrationTypeLabel: string;
	description: string | null;
	status: ExternalIntegrationStatus;
	statusLabel: string;
	config: Record<string, unknown>;
	operationsCount: number;
	lastOperationAt: string | null;
	createdAt: string;
	updatedAt: string;
};

export type IntegrationOperationItem = {
	id: string;
	integrationId: string;
	integrationName: string;
	operationType: IntegrationOperationType;
	operationTypeLabel: string;
	dataType: string;
	executedAt: string;
	status: IntegrationOperationStatus;
	statusLabel: string;
	result: string | null;
};

export type SupplierOrderProposalLineItem = {
	id: string;
	proposalId: string;
	productId: string;
	reference: string;
	description: string;
	category: string | null;
	quantity: number;
	unitPrice: number;
	lineAmount: number;
	reason: string | null;
};

export type SupplierOrderProposalItem = {
	id: string;
	generatedByUserId: string | null;
	generatedByName: string | null;
	generatedAt: string;
	status: SupplierOrderProposalStatus;
	statusLabel: string;
	totalAmount: number;
	totalUnits: number;
	notes: string | null;
	updatedAt: string;
	lines: SupplierOrderProposalLineItem[];
};

export type EnterpriseOperationsSummary = {
	configurations: number;
	integrations: number;
	operations: number;
	successfulOperations: number;
	failedOperations: number;
	proposals: number;
	openProposals: number;
	proposalUnits: number;
	proposalAmount: number;
	lastCheckedAt: string;
};

export type EnterpriseOperationsSnapshot = {
	summary: EnterpriseOperationsSummary;
	configurations: SystemConfigurationItem[];
	integrations: ExternalIntegrationItem[];
	recentOperations: IntegrationOperationItem[];
	proposals: SupplierOrderProposalItem[];
};

export type CreateIntegrationOperationBody = {
	integrationId?: string;
	operationType?: string;
	dataType?: string;
	status?: string;
	result?: string | null;
};

export type GenerateSupplierOrderProposalBody = {
	productIds?: string[];
	quantity?: number | string | null;
	reason?: string | null;
	notes?: string | null;
	status?: string | null;
};
