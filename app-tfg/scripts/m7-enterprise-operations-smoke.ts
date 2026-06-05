import { getEnterpriseOperationsSnapshot } from "@/lib/typeorm/services/admin/enterprise-operations";
import {
	createIntegrationOperation,
	generateSupplierOrderProposal,
} from "@/lib/typeorm/services/admin/enterprise-operations";
import { getDataSource } from "@/lib/typeorm/data-source";
import { PRODUCT_STATUS_IDS } from "@/lib/typeorm/constants/catalog-ids";
import { Product } from "@/lib/typeorm/entities/Product";
import { IntegrationOperation } from "@/lib/typeorm/entities/IntegrationOperation";
import { SupplierOrderProposal } from "@/lib/typeorm/entities/SupplierOrderProposal";
import { ExternalIntegration } from "@/lib/typeorm/entities/ExternalIntegration";
import type { ExternalIntegrationStatus } from "@/lib/typeorm/entities/ExternalIntegration";

function assertCondition(condition: unknown, message: string): asserts condition {
	if (!condition) {
		throw new Error(message);
	}
}

async function cleanup(input: {
	operationId?: string | null;
	proposalId?: string | null;
	integrationId?: string | null;
	integrationStatus?: ExternalIntegrationStatus | null;
}) {
	const dataSource = await getDataSource();

	if (input.operationId) {
		await dataSource.getRepository(IntegrationOperation).delete(input.operationId);
	}

	if (input.proposalId) {
		await dataSource.getRepository(SupplierOrderProposal).delete(input.proposalId);
	}

	if (input.integrationId && input.integrationStatus) {
		await dataSource.getRepository(ExternalIntegration).update(
			{
				id: input.integrationId,
			},
			{
				status: input.integrationStatus,
			},
		);
	}
}

async function main() {
	let createdOperationId: string | null = null;
	let createdProposalId: string | null = null;
	let touchedIntegrationId: string | null = null;
	let initialIntegrationStatus: ExternalIntegrationStatus | null = null;

	try {
		const dataSource = await getDataSource();
		const initialSnapshot = await getEnterpriseOperationsSnapshot(
			new Date("2026-06-05T00:00:00.000Z"),
		);
		const integration = initialSnapshot.integrations.find(
			(item) => item.name === "Factusol mediante n8n",
		);

		assertCondition(
			initialSnapshot.configurations.length >= 3,
			"M7 empresarial debe persistir configuraciones de sistema",
		);
		assertCondition(
			initialSnapshot.integrations.length >= 5,
			"M7 empresarial debe persistir integraciones externas",
		);
		assertCondition(
			integration,
			"M7 empresarial debe preparar la integracion Factusol mediante n8n",
		);
		touchedIntegrationId = integration.id;
		initialIntegrationStatus = integration.status;

		const product = await dataSource.getRepository(Product).findOne({
			where: {
				status_id: PRODUCT_STATUS_IDS.ACTIVE,
			},
		});

		assertCondition(
			product,
			"M7 empresarial necesita al menos un producto activo para proponer reposicion",
		);

		const operation = await createIntegrationOperation({
			integrationId: integration.id,
			operationType: "export",
			dataType: "orders",
			status: "success",
			result: "Smoke temporal M7 enterprise operations",
		});
		createdOperationId = operation.id;

		assertCondition(
			operation.integrationName === "Factusol mediante n8n",
			"La operacion debe quedar asociada a la integracion empresarial",
		);
		assertCondition(
			operation.status === "success",
			"La operacion temporal debe registrarse como correcta",
		);

		const proposal = await generateSupplierOrderProposal({
			productIds: [product.id],
			quantity: 2,
			reason: "smoke_reposicion",
			notes: "Smoke temporal M7 enterprise operations",
			status: "generated",
		});
		createdProposalId = proposal.id;

		assertCondition(
			proposal.lines.length === 1,
			"La propuesta temporal debe contener una linea",
		);
		assertCondition(
			proposal.totalUnits === 2,
			"La propuesta temporal debe conservar las unidades",
		);
		assertCondition(
			proposal.totalAmount >= 0,
			"La propuesta temporal debe calcular el importe total",
		);

		const updatedSnapshot = await getEnterpriseOperationsSnapshot(
			new Date("2026-06-05T00:00:00.000Z"),
		);

		assertCondition(
			updatedSnapshot.recentOperations.some(
				(item) => item.id === createdOperationId,
			),
			"El snapshot M7 debe incluir la operacion registrada",
		);
		assertCondition(
			updatedSnapshot.proposals.some((item) => item.id === createdProposalId),
			"El snapshot M7 debe incluir la propuesta generada",
		);

		console.log("PASS M7 empresarial persiste configuraciones e integraciones");
		console.log("PASS M7 empresarial registra operaciones de integracion");
		console.log("PASS M7 empresarial genera propuestas a proveedor");
	} finally {
		await cleanup({
			operationId: createdOperationId,
			proposalId: createdProposalId,
			integrationId: touchedIntegrationId,
			integrationStatus: initialIntegrationStatus,
		});
	}
}

main()
	.then(() => {
		console.log("M7 enterprise operations smoke OK");
	})
	.catch((error) => {
		console.error("M7 enterprise operations smoke FAILED");
		console.error(error);
		process.exitCode = 1;
	});
