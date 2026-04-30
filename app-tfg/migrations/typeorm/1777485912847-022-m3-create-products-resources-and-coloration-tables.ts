import { MigrationInterface, QueryRunner } from "typeorm";

export class M3CreateProductsResourcesAndColorationTables1777485912847
	implements MigrationInterface
{
	name = "M3CreateProductsResourcesAndColorationTables1777485912847";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "products" (
				"id" uuid NOT NULL DEFAULT gen_random_uuid(),
				"name" text NOT NULL,
				"reference" text NOT NULL,
				"description" text,
				"product_category_id" uuid NOT NULL,
				"product_line_id" uuid NOT NULL,
				"image_url" text,
				"technical_info" text,
				"status_id" smallint NOT NULL,
				"base_price" numeric(12,2) NOT NULL,
				"supplier" text,
				"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				CONSTRAINT "CHK_products_base_price_non_negative"
					CHECK ("base_price" >= 0),
				CONSTRAINT "CHK_products_updated_at_after_created"
					CHECK ("updated_at" >= "created_at"),
				CONSTRAINT "UQ_products_reference" UNIQUE ("reference"),
				CONSTRAINT "PK_products" PRIMARY KEY ("id")
			)
		`);

		await queryRunner.query(`
			CREATE INDEX "products_name_index"
			ON "products" ("name")
		`);

		await queryRunner.query(`
			CREATE INDEX "products_product_category_id_index"
			ON "products" ("product_category_id")
		`);

		await queryRunner.query(`
			CREATE INDEX "products_product_line_id_index"
			ON "products" ("product_line_id")
		`);

		await queryRunner.query(`
			CREATE INDEX "products_status_id_index"
			ON "products" ("status_id")
		`);

		await queryRunner.query(`
			ALTER TABLE "products"
			ADD CONSTRAINT "FK_products_product_category_id"
			FOREIGN KEY ("product_category_id")
			REFERENCES "product_categories"("id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			ALTER TABLE "products"
			ADD CONSTRAINT "FK_products_product_line_id_product_category_id"
			FOREIGN KEY ("product_line_id", "product_category_id")
			REFERENCES "product_lines"("id", "product_category_id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			ALTER TABLE "products"
			ADD CONSTRAINT "FK_products_status_id"
			FOREIGN KEY ("status_id")
			REFERENCES "product_statuses"("id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			CREATE TABLE "support_resources" (
				"id" uuid NOT NULL DEFAULT gen_random_uuid(),
				"title" text NOT NULL,
				"description" text,
				"resource_type_id" smallint NOT NULL,
				"resource_url" text NOT NULL,
				"product_id" uuid,
				"product_line_id" uuid,
				"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				CONSTRAINT "CHK_support_resources_has_context"
					CHECK (
						("product_id" IS NOT NULL) OR ("product_line_id" IS NOT NULL)
					),
				CONSTRAINT "PK_support_resources" PRIMARY KEY ("id")
			)
		`);

		await queryRunner.query(`
			CREATE INDEX "support_resources_resource_type_id_index"
			ON "support_resources" ("resource_type_id")
		`);

		await queryRunner.query(`
			CREATE INDEX "support_resources_product_id_index"
			ON "support_resources" ("product_id")
		`);

		await queryRunner.query(`
			CREATE INDEX "support_resources_product_line_id_index"
			ON "support_resources" ("product_line_id")
		`);

		await queryRunner.query(`
			ALTER TABLE "support_resources"
			ADD CONSTRAINT "FK_support_resources_resource_type_id"
			FOREIGN KEY ("resource_type_id")
			REFERENCES "support_resource_types"("id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			ALTER TABLE "support_resources"
			ADD CONSTRAINT "FK_support_resources_product_id"
			FOREIGN KEY ("product_id")
			REFERENCES "products"("id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			ALTER TABLE "support_resources"
			ADD CONSTRAINT "FK_support_resources_product_line_id"
			FOREIGN KEY ("product_line_id")
			REFERENCES "product_lines"("id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			CREATE TABLE "color_charts" (
				"id" uuid NOT NULL DEFAULT gen_random_uuid(),
				"name" text NOT NULL,
				"description" text,
				"product_line_id" uuid NOT NULL,
				"image_url" text,
				"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				CONSTRAINT "CHK_color_charts_updated_at_after_created"
					CHECK ("updated_at" >= "created_at"),
				CONSTRAINT "PK_color_charts" PRIMARY KEY ("id")
			)
		`);

		await queryRunner.query(`
			CREATE INDEX "color_charts_product_line_id_index"
			ON "color_charts" ("product_line_id")
		`);

		await queryRunner.query(`
			CREATE INDEX "color_charts_name_index"
			ON "color_charts" ("name")
		`);

		await queryRunner.query(`
			ALTER TABLE "color_charts"
			ADD CONSTRAINT "FK_color_charts_product_line_id"
			FOREIGN KEY ("product_line_id")
			REFERENCES "product_lines"("id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			CREATE TABLE "color_references" (
				"id" uuid NOT NULL DEFAULT gen_random_uuid(),
				"color_chart_id" uuid NOT NULL,
				"code" text NOT NULL,
				"name" text NOT NULL,
				"description" text,
				"image_url" text,
				"display_order" integer NOT NULL DEFAULT 0,
				CONSTRAINT "CHK_color_references_display_order_non_negative"
					CHECK ("display_order" >= 0),
				CONSTRAINT "PK_color_references" PRIMARY KEY ("id")
			)
		`);

		await queryRunner.query(`
			CREATE INDEX "color_references_color_chart_id_index"
			ON "color_references" ("color_chart_id")
		`);

		await queryRunner.query(`
			CREATE UNIQUE INDEX "color_references_color_chart_id_code_unique"
			ON "color_references" ("color_chart_id", "code")
		`);

		await queryRunner.query(`
			CREATE UNIQUE INDEX "color_references_color_chart_id_display_order_unique"
			ON "color_references" ("color_chart_id", "display_order")
		`);

		await queryRunner.query(`
			ALTER TABLE "color_references"
			ADD CONSTRAINT "FK_color_references_color_chart_id"
			FOREIGN KEY ("color_chart_id")
			REFERENCES "color_charts"("id")
			ON DELETE CASCADE
			ON UPDATE CASCADE
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "color_references" DROP CONSTRAINT "FK_color_references_color_chart_id"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."color_references_color_chart_id_display_order_unique"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."color_references_color_chart_id_code_unique"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."color_references_color_chart_id_index"
		`);

		await queryRunner.query(`DROP TABLE "color_references"`);

		await queryRunner.query(`
			ALTER TABLE "color_charts" DROP CONSTRAINT "FK_color_charts_product_line_id"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."color_charts_name_index"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."color_charts_product_line_id_index"
		`);

		await queryRunner.query(`DROP TABLE "color_charts"`);

		await queryRunner.query(`
			ALTER TABLE "support_resources" DROP CONSTRAINT "FK_support_resources_product_line_id"
		`);

		await queryRunner.query(`
			ALTER TABLE "support_resources" DROP CONSTRAINT "FK_support_resources_product_id"
		`);

		await queryRunner.query(`
			ALTER TABLE "support_resources" DROP CONSTRAINT "FK_support_resources_resource_type_id"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."support_resources_product_line_id_index"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."support_resources_product_id_index"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."support_resources_resource_type_id_index"
		`);

		await queryRunner.query(`DROP TABLE "support_resources"`);

		await queryRunner.query(`
			ALTER TABLE "products" DROP CONSTRAINT "FK_products_status_id"
		`);

		await queryRunner.query(`
			ALTER TABLE "products" DROP CONSTRAINT "FK_products_product_line_id_product_category_id"
		`);

		await queryRunner.query(`
			ALTER TABLE "products" DROP CONSTRAINT "FK_products_product_category_id"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."products_status_id_index"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."products_product_line_id_index"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."products_product_category_id_index"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."products_name_index"
		`);

		await queryRunner.query(`DROP TABLE "products"`);
	}
}
