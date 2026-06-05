import {
	Column,
	Entity,
	Index,
	JoinColumn,
	ManyToOne,
	PrimaryGeneratedColumn,
} from "typeorm";
import type { Relation } from "typeorm";
import { ExternalIntegration } from "./ExternalIntegration";

export type IntegrationOperationType =
	| "import"
	| "export"
	| "sync"
	| "webhook"
	| "manual";

export type IntegrationOperationStatus = "pending" | "success" | "failed";

@Entity("integration_operations")
@Index("integration_operations_integration_id_index", ["integration_id"])
@Index("integration_operations_executed_at_index", ["executed_at"])
@Index("integration_operations_status_index", ["status"])
export class IntegrationOperation {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "uuid" })
	integration_id!: string;

	@Column({ type: "text" })
	operation_type!: IntegrationOperationType;

	@Column({ type: "text" })
	data_type!: string;

	@Column({ type: "timestamptz", default: () => "now()" })
	executed_at!: Date;

	@Column({ type: "text", default: "pending" })
	status!: IntegrationOperationStatus;

	@Column({ type: "text", nullable: true })
	result!: string | null;

	@ManyToOne(() => ExternalIntegration, (integration) => integration.operations, {
		onDelete: "CASCADE",
		onUpdate: "CASCADE",
	})
	@JoinColumn({ name: "integration_id" })
	integration!: Relation<ExternalIntegration>;
}
