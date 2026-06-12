import { MigrationInterface, QueryRunner } from "typeorm";

export class M4OrderAgencyFulfillment1781264988243 implements MigrationInterface {
	name = "M4OrderAgencyFulfillment1781264988243";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "orders"
			ADD "fulfillment_method" text NOT NULL DEFAULT 'commercial'
		`);
		await queryRunner.query(`
			ALTER TABLE "orders"
			ADD "agency_delivery_fee" numeric(12,2) NOT NULL DEFAULT 0
		`);
		await queryRunner.query(`
			ALTER TABLE "orders"
			ADD CONSTRAINT "orders_fulfillment_method_check"
			CHECK ("fulfillment_method" IN ('commercial', 'agency'))
		`);
		await queryRunner.query(`
			ALTER TABLE "orders"
			ADD CONSTRAINT "orders_agency_delivery_fee_check"
			CHECK ("agency_delivery_fee" >= 0)
		`);
		await queryRunner.query(`
			ALTER TABLE "order_deliveries"
			ADD "fulfillment_method" text NOT NULL DEFAULT 'commercial'
		`);
		await queryRunner.query(`
			ALTER TABLE "order_deliveries"
			ADD CONSTRAINT "order_deliveries_fulfillment_method_check"
			CHECK ("fulfillment_method" IN ('commercial', 'agency'))
		`);
		await queryRunner.query(`
			CREATE INDEX "orders_fulfillment_method_index"
			ON "orders" ("fulfillment_method")
		`);
		await queryRunner.query(`
			CREATE INDEX "order_deliveries_fulfillment_method_index"
			ON "order_deliveries" ("fulfillment_method")
		`);
		await queryRunner.query(`
			INSERT INTO "system_configurations" ("key", "value", "description")
			VALUES (
				'orders.agency_delivery_fee',
				'8.00',
				'Cargo aplicado a pedidos entregados por agencia.'
			)
			ON CONFLICT ("key") DO NOTHING
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DELETE FROM "system_configurations"
			WHERE "key" = 'orders.agency_delivery_fee'
		`);
		await queryRunner.query(`DROP INDEX "order_deliveries_fulfillment_method_index"`);
		await queryRunner.query(`DROP INDEX "orders_fulfillment_method_index"`);
		await queryRunner.query(`
			ALTER TABLE "order_deliveries"
			DROP CONSTRAINT "order_deliveries_fulfillment_method_check"
		`);
		await queryRunner.query(`
			ALTER TABLE "order_deliveries"
			DROP COLUMN "fulfillment_method"
		`);
		await queryRunner.query(`
			ALTER TABLE "orders"
			DROP CONSTRAINT "orders_agency_delivery_fee_check"
		`);
		await queryRunner.query(`
			ALTER TABLE "orders"
			DROP CONSTRAINT "orders_fulfillment_method_check"
		`);
		await queryRunner.query(`
			ALTER TABLE "orders"
			DROP COLUMN "agency_delivery_fee"
		`);
		await queryRunner.query(`
			ALTER TABLE "orders"
			DROP COLUMN "fulfillment_method"
		`);
	}
}
