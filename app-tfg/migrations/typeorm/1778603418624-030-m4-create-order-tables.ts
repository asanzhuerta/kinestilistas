import { MigrationInterface, QueryRunner } from "typeorm";

export class M4CreateOrderTables1778603418624 implements MigrationInterface {
	name = "M4CreateOrderTables1778603418624";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "orders" (
				"id" uuid NOT NULL DEFAULT gen_random_uuid(),
				"client_id" uuid NOT NULL,
				"created_by_user_id" uuid NOT NULL,
				"status_id" smallint NOT NULL,
				"total_amount" numeric(12,2) NOT NULL,
				"notes" text,
				"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				CONSTRAINT "CHK_orders_total_amount_non_negative"
					CHECK ("total_amount" >= 0),
				CONSTRAINT "CHK_orders_updated_at_after_created"
					CHECK ("updated_at" >= "created_at"),
				CONSTRAINT "PK_orders" PRIMARY KEY ("id")
			)
		`);

		await queryRunner.query(`
			CREATE INDEX "orders_client_id_index"
			ON "orders" ("client_id")
		`);

		await queryRunner.query(`
			CREATE INDEX "orders_created_by_user_id_index"
			ON "orders" ("created_by_user_id")
		`);

		await queryRunner.query(`
			CREATE INDEX "orders_status_id_index"
			ON "orders" ("status_id")
		`);

		await queryRunner.query(`
			CREATE INDEX "orders_created_at_index"
			ON "orders" ("created_at")
		`);

		await queryRunner.query(`
			ALTER TABLE "orders"
			ADD CONSTRAINT "FK_orders_client_id"
			FOREIGN KEY ("client_id")
			REFERENCES "clients"("id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			ALTER TABLE "orders"
			ADD CONSTRAINT "FK_orders_created_by_user_id"
			FOREIGN KEY ("created_by_user_id")
			REFERENCES "users"("id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			ALTER TABLE "orders"
			ADD CONSTRAINT "FK_orders_status_id"
			FOREIGN KEY ("status_id")
			REFERENCES "order_statuses"("id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			CREATE TABLE "order_lines" (
				"id" uuid NOT NULL DEFAULT gen_random_uuid(),
				"order_id" uuid NOT NULL,
				"product_id" uuid NOT NULL,
				"quantity" integer NOT NULL,
				"unit_price_snapshot" numeric(12,2) NOT NULL,
				"discount_percentage" numeric(5,2) NOT NULL DEFAULT 0,
				"line_total" numeric(12,2) NOT NULL,
				CONSTRAINT "CHK_order_lines_quantity_positive"
					CHECK ("quantity" > 0),
				CONSTRAINT "CHK_order_lines_unit_price_non_negative"
					CHECK ("unit_price_snapshot" >= 0),
				CONSTRAINT "CHK_order_lines_discount_percentage_range"
					CHECK ("discount_percentage" >= 0 AND "discount_percentage" <= 100),
				CONSTRAINT "CHK_order_lines_line_total_non_negative"
					CHECK ("line_total" >= 0),
				CONSTRAINT "PK_order_lines" PRIMARY KEY ("id")
			)
		`);

		await queryRunner.query(`
			CREATE INDEX "order_lines_order_id_index"
			ON "order_lines" ("order_id")
		`);

		await queryRunner.query(`
			CREATE INDEX "order_lines_product_id_index"
			ON "order_lines" ("product_id")
		`);

		await queryRunner.query(`
			CREATE UNIQUE INDEX "order_lines_order_id_product_id_unique"
			ON "order_lines" ("order_id", "product_id")
		`);

		await queryRunner.query(`
			ALTER TABLE "order_lines"
			ADD CONSTRAINT "FK_order_lines_order_id"
			FOREIGN KEY ("order_id")
			REFERENCES "orders"("id")
			ON DELETE CASCADE
			ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			ALTER TABLE "order_lines"
			ADD CONSTRAINT "FK_order_lines_product_id"
			FOREIGN KEY ("product_id")
			REFERENCES "products"("id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "order_lines" DROP CONSTRAINT "FK_order_lines_product_id"
		`);

		await queryRunner.query(`
			ALTER TABLE "order_lines" DROP CONSTRAINT "FK_order_lines_order_id"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."order_lines_order_id_product_id_unique"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."order_lines_product_id_index"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."order_lines_order_id_index"
		`);

		await queryRunner.query(`DROP TABLE "order_lines"`);

		await queryRunner.query(`
			ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_status_id"
		`);

		await queryRunner.query(`
			ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_created_by_user_id"
		`);

		await queryRunner.query(`
			ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_client_id"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."orders_created_at_index"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."orders_status_id_index"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."orders_created_by_user_id_index"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."orders_client_id_index"
		`);

		await queryRunner.query(`DROP TABLE "orders"`);
	}
}
