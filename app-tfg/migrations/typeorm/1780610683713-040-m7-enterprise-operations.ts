import { MigrationInterface, QueryRunner } from "typeorm";

export class M7EnterpriseOperations1780610683713 implements MigrationInterface {
	name = "M7EnterpriseOperations1780610683713";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "system_configurations" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"key" text NOT NULL,
				"value" text NOT NULL,
				"description" text,
				"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				CONSTRAINT "PK_system_configurations" PRIMARY KEY ("id"),
				CONSTRAINT "UQ_system_configurations_key" UNIQUE ("key")
			)
		`);
		await queryRunner.query(`
			CREATE TABLE "external_integrations" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"name" text NOT NULL,
				"integration_type" text NOT NULL,
				"description" text,
				"status" text NOT NULL DEFAULT 'not_configured',
				"config" jsonb NOT NULL DEFAULT '{}'::jsonb,
				"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				CONSTRAINT "PK_external_integrations" PRIMARY KEY ("id"),
				CONSTRAINT "UQ_external_integrations_name" UNIQUE ("name"),
				CONSTRAINT "CHK_external_integrations_type"
					CHECK ("integration_type" IN ('storage', 'geocoding', 'routing', 'qr', 'erp', 'messaging', 'automation', 'other')),
				CONSTRAINT "CHK_external_integrations_status"
					CHECK ("status" IN ('operational', 'degraded', 'not_configured', 'disabled'))
			)
		`);
		await queryRunner.query(`
			CREATE INDEX "external_integrations_type_index"
			ON "external_integrations" ("integration_type")
		`);
		await queryRunner.query(`
			CREATE INDEX "external_integrations_status_index"
			ON "external_integrations" ("status")
		`);
		await queryRunner.query(`
			CREATE TABLE "integration_operations" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"integration_id" uuid NOT NULL,
				"operation_type" text NOT NULL,
				"data_type" text NOT NULL,
				"executed_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				"status" text NOT NULL DEFAULT 'pending',
				"result" text,
				CONSTRAINT "PK_integration_operations" PRIMARY KEY ("id"),
				CONSTRAINT "CHK_integration_operations_type"
					CHECK ("operation_type" IN ('import', 'export', 'sync', 'webhook', 'manual')),
				CONSTRAINT "CHK_integration_operations_status"
					CHECK ("status" IN ('pending', 'success', 'failed')),
				CONSTRAINT "FK_integration_operations_integration_id"
					FOREIGN KEY ("integration_id") REFERENCES "external_integrations"("id")
					ON DELETE CASCADE ON UPDATE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX "integration_operations_integration_id_index"
			ON "integration_operations" ("integration_id")
		`);
		await queryRunner.query(`
			CREATE INDEX "integration_operations_executed_at_index"
			ON "integration_operations" ("executed_at")
		`);
		await queryRunner.query(`
			CREATE INDEX "integration_operations_status_index"
			ON "integration_operations" ("status")
		`);
		await queryRunner.query(`
			CREATE TABLE "supplier_order_proposals" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"generated_by_user_id" uuid,
				"generated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				"status" text NOT NULL DEFAULT 'draft',
				"total_amount" numeric(12,2) NOT NULL DEFAULT 0,
				"total_units" integer NOT NULL DEFAULT 0,
				"notes" text,
				"updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				CONSTRAINT "PK_supplier_order_proposals" PRIMARY KEY ("id"),
				CONSTRAINT "CHK_supplier_order_proposals_status"
					CHECK ("status" IN ('draft', 'generated', 'exported', 'archived')),
				CONSTRAINT "CHK_supplier_order_proposals_totals"
					CHECK ("total_amount" >= 0 AND "total_units" >= 0),
				CONSTRAINT "FK_supplier_order_proposals_generated_by_user_id"
					FOREIGN KEY ("generated_by_user_id") REFERENCES "users"("id")
					ON DELETE SET NULL ON UPDATE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX "supplier_order_proposals_generated_by_user_id_index"
			ON "supplier_order_proposals" ("generated_by_user_id")
		`);
		await queryRunner.query(`
			CREATE INDEX "supplier_order_proposals_generated_at_index"
			ON "supplier_order_proposals" ("generated_at")
		`);
		await queryRunner.query(`
			CREATE INDEX "supplier_order_proposals_status_index"
			ON "supplier_order_proposals" ("status")
		`);
		await queryRunner.query(`
			CREATE TABLE "supplier_order_proposal_lines" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"proposal_id" uuid NOT NULL,
				"product_id" uuid NOT NULL,
				"reference" text NOT NULL,
				"description" text NOT NULL,
				"category" text,
				"quantity" integer NOT NULL,
				"unit_price" numeric(12,2) NOT NULL,
				"line_amount" numeric(12,2) NOT NULL,
				"reason" text,
				CONSTRAINT "PK_supplier_order_proposal_lines" PRIMARY KEY ("id"),
				CONSTRAINT "CHK_supplier_order_proposal_lines_quantity"
					CHECK ("quantity" > 0),
				CONSTRAINT "CHK_supplier_order_proposal_lines_amounts"
					CHECK ("unit_price" >= 0 AND "line_amount" >= 0),
				CONSTRAINT "FK_supplier_order_proposal_lines_proposal_id"
					FOREIGN KEY ("proposal_id") REFERENCES "supplier_order_proposals"("id")
					ON DELETE CASCADE ON UPDATE CASCADE,
				CONSTRAINT "FK_supplier_order_proposal_lines_product_id"
					FOREIGN KEY ("product_id") REFERENCES "products"("id")
					ON DELETE RESTRICT ON UPDATE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX "supplier_order_proposal_lines_proposal_id_index"
			ON "supplier_order_proposal_lines" ("proposal_id")
		`);
		await queryRunner.query(`
			CREATE INDEX "supplier_order_proposal_lines_product_id_index"
			ON "supplier_order_proposal_lines" ("product_id")
		`);

		await queryRunner.query(`
			INSERT INTO "system_configurations" ("key", "value", "description")
			VALUES
				('operations.sync.default_mode', 'manual', 'Modo inicial de registro de exportaciones y sincronizaciones externas.'),
				('supplier.proposals.default_quantity', '1', 'Cantidad sugerida por defecto al generar propuestas de pedido a proveedor.'),
				('supplier.proposals.default_reason', 'reposicion_manual', 'Motivo base utilizado en propuestas creadas desde catálogo activo.')
			ON CONFLICT ("key") DO NOTHING
		`);
		await queryRunner.query(`
			INSERT INTO "external_integrations" ("name", "integration_type", "description", "status", "config")
			VALUES
				(
					'Cloudinary',
					'storage',
					'Almacenamiento de imágenes de perfil, catálogo y resultados técnicos.',
					'operational',
					'{"provider":"Cloudinary","scope":"media"}'::jsonb
				),
				(
					'Nominatim',
					'geocoding',
					'Geocodificacion de direcciones comerciales y clientes.',
					'operational',
					'{"provider":"OpenStreetMap","scope":"geocoding"}'::jsonb
				),
				(
					'OSRM',
					'routing',
					'Calculo de rutas comerciales y geometria de mapa.',
					'operational',
					'{"provider":"OSRM","scope":"routing"}'::jsonb
				),
				(
					'QuickChart QR',
					'qr',
					'Representacion QR para validación operativa de pedidos.',
					'operational',
					'{"provider":"QuickChart","scope":"orders"}'::jsonb
				),
				(
					'Factusol mediante n8n',
					'erp',
					'Punto preparado para automatizar albaranes, facturación y sincronizacion administrativa mediante n8n.',
					'not_configured',
					'{"orchestrator":"n8n","target":"Factusol","mode":"pending_credentials"}'::jsonb
				)
			ON CONFLICT ("name") DO NOTHING
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX "supplier_order_proposal_lines_product_id_index"`);
		await queryRunner.query(`DROP INDEX "supplier_order_proposal_lines_proposal_id_index"`);
		await queryRunner.query(`DROP TABLE "supplier_order_proposal_lines"`);
		await queryRunner.query(`DROP INDEX "supplier_order_proposals_status_index"`);
		await queryRunner.query(`DROP INDEX "supplier_order_proposals_generated_at_index"`);
		await queryRunner.query(`DROP INDEX "supplier_order_proposals_generated_by_user_id_index"`);
		await queryRunner.query(`DROP TABLE "supplier_order_proposals"`);
		await queryRunner.query(`DROP INDEX "integration_operations_status_index"`);
		await queryRunner.query(`DROP INDEX "integration_operations_executed_at_index"`);
		await queryRunner.query(`DROP INDEX "integration_operations_integration_id_index"`);
		await queryRunner.query(`DROP TABLE "integration_operations"`);
		await queryRunner.query(`DROP INDEX "external_integrations_status_index"`);
		await queryRunner.query(`DROP INDEX "external_integrations_type_index"`);
		await queryRunner.query(`DROP TABLE "external_integrations"`);
		await queryRunner.query(`DROP TABLE "system_configurations"`);
	}
}
