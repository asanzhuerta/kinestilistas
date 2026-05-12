import { MigrationInterface, QueryRunner } from "typeorm";

export class M4OrderableColorReferencesAndDrafts1778603442765
	implements MigrationInterface
{
	name = "M4OrderableColorReferencesAndDrafts1778603442765";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "color_references"
			ADD COLUMN "product_id" uuid NULL
		`);
		await queryRunner.query(`
			ALTER TABLE "color_references"
			ADD COLUMN "erp_reference" text NULL
		`);
		await queryRunner.query(`
			ALTER TABLE "color_references"
			ADD COLUMN "is_orderable" boolean NOT NULL DEFAULT false
		`);
		await queryRunner.query(`
			CREATE INDEX "color_references_product_id_index"
			ON "color_references" ("product_id")
		`);
		await queryRunner.query(`
			CREATE UNIQUE INDEX "color_references_erp_reference_unique"
			ON "color_references" ("erp_reference")
			WHERE "erp_reference" IS NOT NULL
		`);
		await queryRunner.query(`
			ALTER TABLE "color_references"
			ADD CONSTRAINT "FK_color_references_product_id"
			FOREIGN KEY ("product_id")
			REFERENCES "products"("id")
			ON DELETE SET NULL
			ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			DROP INDEX "public"."order_lines_order_id_product_id_unique"
		`);
		await queryRunner.query(`
			ALTER TABLE "order_lines"
			ADD COLUMN "color_reference_id" uuid NULL
		`);
		await queryRunner.query(`
			ALTER TABLE "order_lines"
			ADD COLUMN "order_reference_snapshot" text NOT NULL DEFAULT ''
		`);
		await queryRunner.query(`
			ALTER TABLE "order_lines"
			ADD COLUMN "variant_code_snapshot" text NULL
		`);
		await queryRunner.query(`
			ALTER TABLE "order_lines"
			ADD COLUMN "variant_name_snapshot" text NULL
		`);
		await queryRunner.query(`
			CREATE INDEX "order_lines_color_reference_id_index"
			ON "order_lines" ("color_reference_id")
		`);
		await queryRunner.query(`
			ALTER TABLE "order_lines"
			ADD CONSTRAINT "FK_order_lines_color_reference_id"
			FOREIGN KEY ("color_reference_id")
			REFERENCES "color_references"("id")
			ON DELETE SET NULL
			ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			INSERT INTO "order_statuses" ("id", "code", "name")
			VALUES (5, 'draft', 'Borrador')
		`);
		await queryRunner.query(`
			CREATE UNIQUE INDEX "orders_client_id_created_by_user_id_draft_unique"
			ON "orders" ("client_id", "created_by_user_id")
			WHERE "status_id" = 5
		`);
		await queryRunner.query(`
			UPDATE "order_lines" AS "orderLine"
			SET "order_reference_snapshot" = "product"."reference"
			FROM "products" AS "product"
			WHERE "product"."id" = "orderLine"."product_id"
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			UPDATE "orders"
			SET "status_id" = 1
			WHERE "status_id" = 5
		`);
		await queryRunner.query(`
			DROP INDEX "public"."orders_client_id_created_by_user_id_draft_unique"
		`);
		await queryRunner.query(`
			DELETE FROM "order_statuses"
			WHERE "id" = 5
		`);

		await queryRunner.query(`
			ALTER TABLE "order_lines"
			DROP CONSTRAINT "FK_order_lines_color_reference_id"
		`);
		await queryRunner.query(`
			DROP INDEX "public"."order_lines_color_reference_id_index"
		`);
		await queryRunner.query(`
			ALTER TABLE "order_lines"
			DROP COLUMN "variant_name_snapshot"
		`);
		await queryRunner.query(`
			ALTER TABLE "order_lines"
			DROP COLUMN "variant_code_snapshot"
		`);
		await queryRunner.query(`
			ALTER TABLE "order_lines"
			DROP COLUMN "order_reference_snapshot"
		`);
		await queryRunner.query(`
			ALTER TABLE "order_lines"
			DROP COLUMN "color_reference_id"
		`);
		await queryRunner.query(`
			CREATE UNIQUE INDEX "order_lines_order_id_product_id_unique"
			ON "order_lines" ("order_id", "product_id")
		`);

		await queryRunner.query(`
			ALTER TABLE "color_references"
			DROP CONSTRAINT "FK_color_references_product_id"
		`);
		await queryRunner.query(`
			DROP INDEX "public"."color_references_erp_reference_unique"
		`);
		await queryRunner.query(`
			DROP INDEX "public"."color_references_product_id_index"
		`);
		await queryRunner.query(`
			ALTER TABLE "color_references"
			DROP COLUMN "is_orderable"
		`);
		await queryRunner.query(`
			ALTER TABLE "color_references"
			DROP COLUMN "erp_reference"
		`);
		await queryRunner.query(`
			ALTER TABLE "color_references"
			DROP COLUMN "product_id"
		`);
	}
}
