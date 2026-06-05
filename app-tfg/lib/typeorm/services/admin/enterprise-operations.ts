import { getDataSource } from "@/lib/typeorm/data-source";
import { PRODUCT_STATUS_IDS } from "@/lib/typeorm/constants/catalog-ids";
import type {
	EnterpriseOperationsSnapshot,
	ExternalIntegrationItem,
	IntegrationOperationItem,
	SupplierOrderProposalItem,
	SupplierOrderProposalLineItem,
	SystemConfigurationItem,
} from "@/lib/contracts/enterprise-operations";
import { Product } from "@/lib/typeorm/entities/Product";
import { SystemConfiguration } from "@/lib/typeorm/entities/SystemConfiguration";
import {
	ExternalIntegration,
	type ExternalIntegrationStatus,
	type ExternalIntegrationType,
} from "@/lib/typeorm/entities/ExternalIntegration";
import {
	IntegrationOperation,
	type IntegrationOperationStatus,
	type IntegrationOperationType,
} from "@/lib/typeorm/entities/IntegrationOperation";
import {
	SupplierOrderProposal,
	type SupplierOrderProposalStatus,
} from "@/lib/typeorm/entities/SupplierOrderProposal";
import { SupplierOrderProposalLine } from "@/lib/typeorm/entities/SupplierOrderProposalLine";

const INTEGRATION_TYPES = [
	"storage",
	"geocoding",
	"routing",
	"qr",
	"erp",
	"messaging",
	"automation",
	"other",
] as const satisfies readonly ExternalIntegrationType[];
const INTEGRATION_STATUSES = [
	"operational",
	"degraded",
	"not_configured",
	"disabled",
] as const satisfies readonly ExternalIntegrationStatus[];
const OPERATION_TYPES = [
	"import",
	"export",
	"sync",
	"webhook",
	"manual",
] as const satisfies readonly IntegrationOperationType[];
const OPERATION_STATUSES = [
	"pending",
	"success",
	"failed",
] as const satisfies readonly IntegrationOperationStatus[];
const PROPOSAL_STATUSES = [
	"draft",
	"generated",
	"exported",
	"archived",
] as const satisfies readonly SupplierOrderProposalStatus[];

const DEFAULT_PROPOSAL_LIMIT = 8;
const RECENT_OPERATION_LIMIT = 10;

export class EnterpriseOperationsServiceError extends Error {
	status: number;
	code: string;

	constructor(
		message: string,
		status = 400,
		code = "ENTERPRISE_OPERATIONS_ERROR",
	) {
		super(message);
		this.name = "EnterpriseOperationsServiceError";
		this.status = status;
		this.code = code;
	}
}

function isOneOf<T extends readonly string[]>(
	value: string | null | undefined,
	allowedValues: T,
): value is T[number] {
	return typeof value === "string" && allowedValues.includes(value);
}

function normalizeText(
	value: string | null | undefined,
	fieldName: string,
	options: { required?: boolean; maxLength?: number } = {},
) {
	const normalized = String(value ?? "").trim().replace(/\s+/g, " ");

	if (!normalized && options.required) {
		throw new EnterpriseOperationsServiceError(`${fieldName} es obligatorio`);
	}

	if (options.maxLength && normalized.length > options.maxLength) {
		throw new EnterpriseOperationsServiceError(
			`${fieldName} no puede superar ${options.maxLength} caracteres`,
		);
	}

	return normalized || null;
}

function parsePositiveInteger(
	value: number | string | null | undefined,
	fieldName: string,
	fallback: number,
) {
	const normalized =
		value === undefined || value === null || value === ""
			? fallback
			: Number(value);

	if (!Number.isInteger(normalized) || normalized <= 0) {
		throw new EnterpriseOperationsServiceError(
			`${fieldName} debe ser un entero positivo`,
		);
	}

	return normalized;
}

function money(value: number) {
	return Number(value.toFixed(2));
}

function toIso(value: Date | string | null | undefined) {
	return value ? new Date(value).toISOString() : null;
}

function getIntegrationTypeLabel(type: ExternalIntegrationType) {
	const labels: Record<ExternalIntegrationType, string> = {
		storage: "Almacenamiento",
		geocoding: "Geocodificacion",
		routing: "Rutas",
		qr: "QR",
		erp: "ERP / facturacion",
		messaging: "Mensajeria",
		automation: "Automatizacion",
		other: "Otra",
	};

	return labels[type] ?? type;
}

function getIntegrationStatusLabel(status: ExternalIntegrationStatus) {
	const labels: Record<ExternalIntegrationStatus, string> = {
		operational: "Operativa",
		degraded: "Degradada",
		not_configured: "No configurada",
		disabled: "Deshabilitada",
	};

	return labels[status] ?? status;
}

function getOperationTypeLabel(type: IntegrationOperationType) {
	const labels: Record<IntegrationOperationType, string> = {
		import: "Importacion",
		export: "Exportacion",
		sync: "Sincronizacion",
		webhook: "Webhook",
		manual: "Manual",
	};

	return labels[type] ?? type;
}

function getOperationStatusLabel(status: IntegrationOperationStatus) {
	const labels: Record<IntegrationOperationStatus, string> = {
		pending: "Pendiente",
		success: "Correcta",
		failed: "Fallida",
	};

	return labels[status] ?? status;
}

function getProposalStatusLabel(status: SupplierOrderProposalStatus) {
	const labels: Record<SupplierOrderProposalStatus, string> = {
		draft: "Borrador",
		generated: "Generada",
		exported: "Exportada",
		archived: "Archivada",
	};

	return labels[status] ?? status;
}

function mapSystemConfiguration(
	configuration: SystemConfiguration,
): SystemConfigurationItem {
	return {
		id: configuration.id,
		key: configuration.key,
		value: configuration.value,
		description: configuration.description,
		createdAt: configuration.created_at.toISOString(),
		updatedAt: configuration.updated_at.toISOString(),
	};
}

function mapExternalIntegration(
	integration: ExternalIntegration,
	operationStats: Map<
		string,
		{ operationsCount: number; lastOperationAt: string | null }
	>,
): ExternalIntegrationItem {
	const stats = operationStats.get(integration.id);

	return {
		id: integration.id,
		name: integration.name,
		integrationType: integration.integration_type,
		integrationTypeLabel: getIntegrationTypeLabel(integration.integration_type),
		description: integration.description,
		status: integration.status,
		statusLabel: getIntegrationStatusLabel(integration.status),
		config: integration.config ?? {},
		operationsCount: stats?.operationsCount ?? 0,
		lastOperationAt: stats?.lastOperationAt ?? null,
		createdAt: integration.created_at.toISOString(),
		updatedAt: integration.updated_at.toISOString(),
	};
}

function mapIntegrationOperation(
	operation: IntegrationOperation,
): IntegrationOperationItem {
	return {
		id: operation.id,
		integrationId: operation.integration_id,
		integrationName: operation.integration?.name ?? "Integracion externa",
		operationType: operation.operation_type,
		operationTypeLabel: getOperationTypeLabel(operation.operation_type),
		dataType: operation.data_type,
		executedAt: operation.executed_at.toISOString(),
		status: operation.status,
		statusLabel: getOperationStatusLabel(operation.status),
		result: operation.result,
	};
}

function mapProposalLine(
	line: SupplierOrderProposalLine,
): SupplierOrderProposalLineItem {
	return {
		id: line.id,
		proposalId: line.proposal_id,
		productId: line.product_id,
		reference: line.reference,
		description: line.description,
		category: line.category,
		quantity: line.quantity,
		unitPrice: Number(line.unit_price),
		lineAmount: Number(line.line_amount),
		reason: line.reason,
	};
}

function mapSupplierOrderProposal(
	proposal: SupplierOrderProposal,
): SupplierOrderProposalItem {
	return {
		id: proposal.id,
		generatedByUserId: proposal.generated_by_user_id,
		generatedByName: proposal.generatedByUser?.name ?? null,
		generatedAt: proposal.generated_at.toISOString(),
		status: proposal.status,
		statusLabel: getProposalStatusLabel(proposal.status),
		totalAmount: Number(proposal.total_amount),
		totalUnits: proposal.total_units,
		notes: proposal.notes,
		updatedAt: proposal.updated_at.toISOString(),
		lines: (proposal.lines ?? []).map(mapProposalLine),
	};
}

async function getOperationStatsByIntegration() {
	const dataSource = await getDataSource();
	const rows = (await dataSource
		.getRepository(IntegrationOperation)
		.createQueryBuilder("operation")
		.select("operation.integration_id", "integrationId")
		.addSelect("COUNT(operation.id)", "operationsCount")
		.addSelect("MAX(operation.executed_at)", "lastOperationAt")
		.groupBy("operation.integration_id")
		.getRawMany()) as Array<{
		integrationId: string;
		operationsCount: string;
		lastOperationAt: Date | string | null;
	}>;

	return new Map(
		rows.map((row) => [
			row.integrationId,
			{
				operationsCount: Number(row.operationsCount),
				lastOperationAt: toIso(row.lastOperationAt),
			},
		]),
	);
}

export async function listSystemConfigurations() {
	const dataSource = await getDataSource();
	const configurations = await dataSource
		.getRepository(SystemConfiguration)
		.find({
			order: {
				key: "ASC",
			},
		});

	return configurations.map(mapSystemConfiguration);
}

export async function listExternalIntegrations() {
	const dataSource = await getDataSource();
	const [integrations, operationStats] = await Promise.all([
		dataSource.getRepository(ExternalIntegration).find({
			order: {
				integration_type: "ASC",
				name: "ASC",
			},
		}),
		getOperationStatsByIntegration(),
	]);

	return integrations.map((integration) =>
		mapExternalIntegration(integration, operationStats),
	);
}

export async function listRecentIntegrationOperations(
	limit = RECENT_OPERATION_LIMIT,
) {
	const dataSource = await getDataSource();
	const operations = await dataSource
		.getRepository(IntegrationOperation)
		.createQueryBuilder("operation")
		.leftJoinAndSelect("operation.integration", "integration")
		.orderBy("operation.executed_at", "DESC")
		.take(limit)
		.getMany();

	return operations.map(mapIntegrationOperation);
}

export async function listSupplierOrderProposals(limit = 8) {
	const dataSource = await getDataSource();
	const proposals = await dataSource
		.getRepository(SupplierOrderProposal)
		.createQueryBuilder("proposal")
		.leftJoinAndSelect("proposal.generatedByUser", "generatedByUser")
		.leftJoinAndSelect("proposal.lines", "lines")
		.orderBy("proposal.generated_at", "DESC")
		.addOrderBy("lines.reference", "ASC")
		.take(limit)
		.getMany();

	return proposals.map(mapSupplierOrderProposal);
}

export async function getEnterpriseOperationsSnapshot(
	now = new Date(),
): Promise<EnterpriseOperationsSnapshot> {
	const [
		configurations,
		integrations,
		recentOperations,
		proposals,
	] = await Promise.all([
		listSystemConfigurations(),
		listExternalIntegrations(),
		listRecentIntegrationOperations(),
		listSupplierOrderProposals(),
	]);
	const successfulOperations = recentOperations.filter(
		(operation) => operation.status === "success",
	).length;
	const failedOperations = recentOperations.filter(
		(operation) => operation.status === "failed",
	).length;
	const openProposals = proposals.filter(
		(proposal) =>
			proposal.status === "draft" || proposal.status === "generated",
	);

	return {
		summary: {
			configurations: configurations.length,
			integrations: integrations.length,
			operations: recentOperations.length,
			successfulOperations,
			failedOperations,
			proposals: proposals.length,
			openProposals: openProposals.length,
			proposalUnits: proposals.reduce(
				(total, proposal) => total + proposal.totalUnits,
				0,
			),
			proposalAmount: money(
				proposals.reduce((total, proposal) => total + proposal.totalAmount, 0),
			),
			lastCheckedAt: now.toISOString(),
		},
		configurations,
		integrations,
		recentOperations,
		proposals,
	};
}

export async function createIntegrationOperation(input: {
	integrationId?: string;
	operationType?: string;
	dataType?: string;
	status?: string;
	result?: string | null;
}) {
	if (!input.integrationId) {
		throw new EnterpriseOperationsServiceError(
			"La integracion es obligatoria",
			400,
			"INTEGRATION_REQUIRED",
		);
	}

	const operationType = input.operationType;

	if (!isOneOf(operationType, OPERATION_TYPES)) {
		throw new EnterpriseOperationsServiceError(
			"El tipo de operacion no es valido",
			400,
			"INVALID_OPERATION_TYPE",
		);
	}

	const operationStatus = input.status || "success";

	if (!isOneOf(operationStatus, OPERATION_STATUSES)) {
		throw new EnterpriseOperationsServiceError(
			"El estado de la operacion no es valido",
			400,
			"INVALID_OPERATION_STATUS",
		);
	}

	const dataType = normalizeText(input.dataType, "El tipo de dato", {
		required: true,
		maxLength: 80,
	});
	if (!dataType) {
		throw new EnterpriseOperationsServiceError(
			"El tipo de dato es obligatorio",
			400,
			"DATA_TYPE_REQUIRED",
		);
	}
	const result = normalizeText(input.result, "El resultado", {
		maxLength: 500,
	});
	const dataSource = await getDataSource();

	const operation = await dataSource.transaction(async (manager) => {
		const integrationRepo = manager.getRepository(ExternalIntegration);
		const operationRepo = manager.getRepository(IntegrationOperation);
		const integration = await integrationRepo.findOne({
			where: {
				id: input.integrationId,
			},
		});

		if (!integration) {
			throw new EnterpriseOperationsServiceError(
				"Integracion no encontrada",
				404,
				"INTEGRATION_NOT_FOUND",
			);
		}

		if (integration.status !== "disabled") {
			integration.status =
				operationStatus === "failed" ? "degraded" : "operational";
			await integrationRepo.save(integration);
		}

		return operationRepo.save(
			operationRepo.create({
				integration_id: integration.id,
				operation_type: operationType,
				data_type: dataType,
				status: operationStatus,
				result: result ?? undefined,
			}),
		);
	});

	const savedOperation = await dataSource
		.getRepository(IntegrationOperation)
		.createQueryBuilder("operation")
		.leftJoinAndSelect("operation.integration", "integration")
		.where("operation.id = :operationId", { operationId: operation.id })
		.getOneOrFail();

	return mapIntegrationOperation(savedOperation);
}

export async function generateSupplierOrderProposal(input: {
	generatedByUserId?: string | null;
	productIds?: string[];
	quantity?: number | string | null;
	reason?: string | null;
	notes?: string | null;
	status?: string | null;
}) {
	const quantity = parsePositiveInteger(input.quantity, "La cantidad", 1);
	const reason =
		normalizeText(input.reason, "El motivo", { maxLength: 160 }) ??
		"reposicion_manual";
	const notes = normalizeText(input.notes, "Las notas", { maxLength: 500 });
	const status = input.status || "generated";

	if (!isOneOf(status, PROPOSAL_STATUSES)) {
		throw new EnterpriseOperationsServiceError(
			"El estado de la propuesta no es valido",
			400,
			"INVALID_PROPOSAL_STATUS",
		);
	}

	const productIds = Array.isArray(input.productIds)
		? input.productIds
				.map((productId) => String(productId ?? "").trim())
				.filter(Boolean)
		: [];
	const dataSource = await getDataSource();

	const proposalId = await dataSource.transaction(async (manager) => {
		const productRepo = manager.getRepository(Product);
		const proposalRepo = manager.getRepository(SupplierOrderProposal);
		const lineRepo = manager.getRepository(SupplierOrderProposalLine);
		const productQuery = productRepo
			.createQueryBuilder("product")
			.leftJoinAndSelect("product.productCategory", "productCategory")
			.leftJoinAndSelect("product.productLine", "productLine")
			.where("product.status_id = :statusId", {
				statusId: PRODUCT_STATUS_IDS.ACTIVE,
			})
			.orderBy("product.created_at", "DESC");

		if (productIds.length > 0) {
			productQuery.andWhere("product.id IN (:...productIds)", {
				productIds,
			});
		} else {
			productQuery.take(DEFAULT_PROPOSAL_LIMIT);
		}

		const products = await productQuery.getMany();

		if (products.length === 0) {
			throw new EnterpriseOperationsServiceError(
				"No hay productos activos para generar la propuesta",
				400,
				"SUPPLIER_PROPOSAL_PRODUCTS_REQUIRED",
			);
		}

		const lineInputs = products.map((product) => {
			const unitPrice = Number(product.base_price);
			const lineAmount = money(unitPrice * quantity);
			const category = [
				product.productCategory?.name,
				product.productLine?.name,
			]
				.filter(Boolean)
				.join(" / ");

			return {
				product_id: product.id,
				reference: product.reference,
				description: product.name,
				category: category || null,
				quantity,
				unit_price: unitPrice.toFixed(2),
				line_amount: lineAmount.toFixed(2),
				reason,
			};
		});
		const totalAmount = money(
			lineInputs.reduce(
				(total, lineInput) => total + Number(lineInput.line_amount),
				0,
			),
		);
		const totalUnits = lineInputs.reduce(
			(total, lineInput) => total + lineInput.quantity,
			0,
		);
		const proposal = await proposalRepo.save(
			proposalRepo.create({
				generated_by_user_id: input.generatedByUserId || null,
				status,
				total_amount: totalAmount.toFixed(2),
				total_units: totalUnits,
				notes,
			}),
		);

		await lineRepo.save(
			lineInputs.map((lineInput) =>
				lineRepo.create({
					...lineInput,
					proposal_id: proposal.id,
				}),
			),
		);

		return proposal.id;
	});

	const proposal = await dataSource
		.getRepository(SupplierOrderProposal)
		.createQueryBuilder("proposal")
		.leftJoinAndSelect("proposal.generatedByUser", "generatedByUser")
		.leftJoinAndSelect("proposal.lines", "lines")
		.where("proposal.id = :proposalId", { proposalId })
		.getOneOrFail();

	return mapSupplierOrderProposal(proposal);
}

export const enterpriseOperationOptions = {
	integrationTypes: INTEGRATION_TYPES,
	integrationStatuses: INTEGRATION_STATUSES,
	operationTypes: OPERATION_TYPES,
	operationStatuses: OPERATION_STATUSES,
	proposalStatuses: PROPOSAL_STATUSES,
};
