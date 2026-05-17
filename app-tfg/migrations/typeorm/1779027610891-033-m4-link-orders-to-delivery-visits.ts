import { MigrationInterface, QueryRunner } from "typeorm";

export class M4LinkOrdersToDeliveryVisits1779027610891
	implements MigrationInterface
{
	name = "M4LinkOrdersToDeliveryVisits1779027610891";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "orders"
			ADD COLUMN "delivery_visit_id" uuid
		`);

		await queryRunner.query(`
			CREATE INDEX "orders_delivery_visit_id_index"
			ON "orders" ("delivery_visit_id")
		`);

		await queryRunner.query(`
			ALTER TABLE "orders"
			ADD CONSTRAINT "FK_orders_delivery_visit_id"
			FOREIGN KEY ("delivery_visit_id")
			REFERENCES "commercial_visits"("id")
			ON DELETE SET NULL
			ON UPDATE CASCADE
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "orders"
			DROP CONSTRAINT "FK_orders_delivery_visit_id"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."orders_delivery_visit_id_index"
		`);

		await queryRunner.query(`
			ALTER TABLE "orders"
			DROP COLUMN "delivery_visit_id"
		`);
	}
}
