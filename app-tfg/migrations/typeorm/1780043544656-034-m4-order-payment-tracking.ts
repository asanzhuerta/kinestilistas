import { MigrationInterface, QueryRunner } from "typeorm";

export class M4OrderPaymentTracking1780043544656
	implements MigrationInterface
{
	name = "M4OrderPaymentTracking1780043544656";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "order_payment_statuses" (
				"id" smallint NOT NULL,
				"code" text NOT NULL,
				"name" text NOT NULL,
				CONSTRAINT "UQ_order_payment_statuses_code" UNIQUE ("code"),
				CONSTRAINT "UQ_order_payment_statuses_name" UNIQUE ("name"),
				CONSTRAINT "PK_order_payment_statuses" PRIMARY KEY ("id")
			)
		`);

		await queryRunner.query(`
			INSERT INTO "order_payment_statuses" ("id", "code", "name")
			VALUES
				(1, 'pending', 'Pendiente'),
				(2, 'paid', 'Cobrado')
		`);

		await queryRunner.query(`
			ALTER TABLE "orders"
			ADD COLUMN "payment_status_id" smallint NOT NULL DEFAULT 1
		`);
		await queryRunner.query(`
			ALTER TABLE "orders"
			ADD COLUMN "payment_method" text NULL
		`);
		await queryRunner.query(`
			ALTER TABLE "orders"
			ADD COLUMN "payment_notes" text NULL
		`);
		await queryRunner.query(`
			ALTER TABLE "orders"
			ADD COLUMN "paid_at" TIMESTAMP WITH TIME ZONE NULL
		`);
		await queryRunner.query(`
			ALTER TABLE "orders"
			ADD COLUMN "paid_by_user_id" uuid NULL
		`);

		await queryRunner.query(`
			CREATE INDEX "orders_payment_status_id_index"
			ON "orders" ("payment_status_id")
		`);
		await queryRunner.query(`
			CREATE INDEX "orders_paid_by_user_id_index"
			ON "orders" ("paid_by_user_id")
		`);

		await queryRunner.query(`
			ALTER TABLE "orders"
			ADD CONSTRAINT "FK_orders_payment_status_id"
			FOREIGN KEY ("payment_status_id")
			REFERENCES "order_payment_statuses"("id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			ALTER TABLE "orders"
			ADD CONSTRAINT "FK_orders_paid_by_user_id"
			FOREIGN KEY ("paid_by_user_id")
			REFERENCES "users"("id")
			ON DELETE SET NULL
			ON UPDATE CASCADE
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_paid_by_user_id"
		`);
		await queryRunner.query(`
			ALTER TABLE "orders" DROP CONSTRAINT "FK_orders_payment_status_id"
		`);
		await queryRunner.query(`
			DROP INDEX "public"."orders_paid_by_user_id_index"
		`);
		await queryRunner.query(`
			DROP INDEX "public"."orders_payment_status_id_index"
		`);
		await queryRunner.query(`
			ALTER TABLE "orders" DROP COLUMN "paid_by_user_id"
		`);
		await queryRunner.query(`
			ALTER TABLE "orders" DROP COLUMN "paid_at"
		`);
		await queryRunner.query(`
			ALTER TABLE "orders" DROP COLUMN "payment_notes"
		`);
		await queryRunner.query(`
			ALTER TABLE "orders" DROP COLUMN "payment_method"
		`);
		await queryRunner.query(`
			ALTER TABLE "orders" DROP COLUMN "payment_status_id"
		`);
		await queryRunner.query(`DROP TABLE "order_payment_statuses"`);
	}
}
