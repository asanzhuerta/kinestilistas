import {
	Column,
	CreateDateColumn,
	Entity,
	Index,
	OneToMany,
	PrimaryGeneratedColumn,
	UpdateDateColumn,
} from "typeorm";
import type { Relation } from "typeorm";
import { IntegrationOperation } from "./IntegrationOperation";

export type ExternalIntegrationType =
	| "storage"
	| "geocoding"
	| "routing"
	| "qr"
	| "erp"
	| "messaging"
	| "automation"
	| "other";

export type ExternalIntegrationStatus =
	| "operational"
	| "degraded"
	| "not_configured"
	| "disabled";

@Entity("external_integrations")
@Index("external_integrations_type_index", ["integration_type"])
@Index("external_integrations_status_index", ["status"])
export class ExternalIntegration {
	@PrimaryGeneratedColumn("uuid")
	id!: string;

	@Column({ type: "text", unique: true })
	name!: string;

	@Column({ type: "text" })
	integration_type!: ExternalIntegrationType;

	@Column({ type: "text", nullable: true })
	description!: string | null;

	@Column({ type: "text", default: "not_configured" })
	status!: ExternalIntegrationStatus;

	@Column({ type: "jsonb", default: {} })
	config!: Record<string, unknown>;

	@OneToMany(
		() => IntegrationOperation,
		(integrationOperation) => integrationOperation.integration,
	)
	operations!: Relation<IntegrationOperation[]>;

	@CreateDateColumn({ type: "timestamptz" })
	created_at!: Date;

	@UpdateDateColumn({ type: "timestamptz" })
	updated_at!: Date;
}
