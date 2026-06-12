import { MigrationInterface, QueryRunner } from "typeorm";

export class M4OrderPartialPayments1781257139171
	implements MigrationInterface
{
	name = "M4OrderPartialPayments1781257139171";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "order_payments" (
				"id" uuid NOT NULL DEFAULT gen_random_uuid(),
				"order_id" uuid NOT NULL,
				"amount" numeric(12,2) NOT NULL,
				"payment_method" text NOT NULL,
				"notes" text NULL,
				"paid_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				"registered_by_user_id" uuid NULL,
				"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				CONSTRAINT "CHK_order_payments_amount_positive"
					CHECK ("amount" > 0),
				CONSTRAINT "PK_order_payments" PRIMARY KEY ("id")
			)
		`);

		await queryRunner.query(`
			CREATE INDEX "order_payments_order_id_index"
			ON "order_payments" ("order_id")
		`);
		await queryRunner.query(`
			CREATE INDEX "order_payments_registered_by_user_id_index"
			ON "order_payments" ("registered_by_user_id")
		`);
		await queryRunner.query(`
			CREATE INDEX "order_payments_paid_at_index"
			ON "order_payments" ("paid_at")
		`);

		await queryRunner.query(`
			ALTER TABLE "order_payments"
			ADD CONSTRAINT "FK_order_payments_order_id"
			FOREIGN KEY ("order_id")
			REFERENCES "orders"("id")
			ON DELETE CASCADE
			ON UPDATE CASCADE
		`);
		await queryRunner.query(`
			ALTER TABLE "order_payments"
			ADD CONSTRAINT "FK_order_payments_registered_by_user_id"
			FOREIGN KEY ("registered_by_user_id")
			REFERENCES "users"("id")
			ON DELETE SET NULL
			ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			INSERT INTO "order_payments" (
				"order_id",
				"amount",
				"payment_method",
				"notes",
				"paid_at",
				"registered_by_user_id",
				"created_at",
				"updated_at"
			)
			SELECT
				"orders"."id",
				"orders"."total_amount",
				COALESCE(NULLIF("orders"."payment_method", ''), 'other'),
				"orders"."payment_notes",
				COALESCE("orders"."paid_at", "orders"."updated_at", "orders"."created_at"),
				"orders"."paid_by_user_id",
				COALESCE("orders"."paid_at", "orders"."updated_at", "orders"."created_at"),
				COALESCE("orders"."paid_at", "orders"."updated_at", "orders"."created_at")
			FROM "orders"
			WHERE
				"orders"."payment_status_id" = 2
				AND "orders"."total_amount" > 0
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "order_payments"
			DROP CONSTRAINT "FK_order_payments_registered_by_user_id"
		`);
		await queryRunner.query(`
			ALTER TABLE "order_payments"
			DROP CONSTRAINT "FK_order_payments_order_id"
		`);
		await queryRunner.query(`
			DROP INDEX "public"."order_payments_paid_at_index"
		`);
		await queryRunner.query(`
			DROP INDEX "public"."order_payments_registered_by_user_id_index"
		`);
		await queryRunner.query(`
			DROP INDEX "public"."order_payments_order_id_index"
		`);
		await queryRunner.query(`DROP TABLE "order_payments"`);
	}
}
