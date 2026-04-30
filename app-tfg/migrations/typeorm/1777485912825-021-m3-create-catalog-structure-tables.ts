import { MigrationInterface, QueryRunner } from "typeorm";

export class M3CreateCatalogStructureTables1777485912825
	implements MigrationInterface
{
	name = "M3CreateCatalogStructureTables1777485912825";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "product_categories" (
				"id" uuid NOT NULL DEFAULT gen_random_uuid(),
				"name" text NOT NULL,
				"description" text,
				"display_order" integer NOT NULL DEFAULT 0,
				CONSTRAINT "CHK_product_categories_display_order_non_negative"
					CHECK ("display_order" >= 0),
				CONSTRAINT "UQ_product_categories_name" UNIQUE ("name"),
				CONSTRAINT "PK_product_categories" PRIMARY KEY ("id")
			)
		`);

		await queryRunner.query(`
			CREATE INDEX "product_categories_display_order_index"
			ON "product_categories" ("display_order")
		`);

		await queryRunner.query(`
			CREATE TABLE "product_lines" (
				"id" uuid NOT NULL DEFAULT gen_random_uuid(),
				"name" text NOT NULL,
				"description" text,
				"product_category_id" uuid NOT NULL,
				"image_url" text,
				"display_order" integer NOT NULL DEFAULT 0,
				CONSTRAINT "CHK_product_lines_display_order_non_negative"
					CHECK ("display_order" >= 0),
				CONSTRAINT "UQ_product_lines_name" UNIQUE ("name"),
				CONSTRAINT "PK_product_lines" PRIMARY KEY ("id")
			)
		`);

		await queryRunner.query(`
			CREATE INDEX "product_lines_product_category_id_index"
			ON "product_lines" ("product_category_id")
		`);

		await queryRunner.query(`
			CREATE INDEX "product_lines_display_order_index"
			ON "product_lines" ("display_order")
		`);

		await queryRunner.query(`
			CREATE UNIQUE INDEX "product_lines_id_product_category_id_unique"
			ON "product_lines" ("id", "product_category_id")
		`);

		await queryRunner.query(`
			ALTER TABLE "product_lines"
			ADD CONSTRAINT "FK_product_lines_product_category_id"
			FOREIGN KEY ("product_category_id")
			REFERENCES "product_categories"("id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "product_lines" DROP CONSTRAINT "FK_product_lines_product_category_id"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."product_lines_id_product_category_id_unique"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."product_lines_display_order_index"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."product_lines_product_category_id_index"
		`);

		await queryRunner.query(`DROP TABLE "product_lines"`);

		await queryRunner.query(`
			DROP INDEX "public"."product_categories_display_order_index"
		`);

		await queryRunner.query(`DROP TABLE "product_categories"`);
	}
}
