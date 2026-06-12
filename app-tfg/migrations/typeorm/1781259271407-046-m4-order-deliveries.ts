import { MigrationInterface, QueryRunner } from "typeorm";

export class M4OrderDeliveries1781259271407 implements MigrationInterface {
	name = "M4OrderDeliveries1781259271407";

    public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "order_deliveries" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"order_id" uuid NOT NULL,
				"commercial_id" uuid NOT NULL,
				"delivery_visit_id" uuid,
				"status" text NOT NULL DEFAULT 'prepared',
				"package_count" integer NOT NULL,
				"notes" text,
				"delivered_at" TIMESTAMP WITH TIME ZONE,
				"delivered_by_user_id" uuid,
				"created_by_user_id" uuid,
				"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				CONSTRAINT "order_deliveries_status_check" CHECK ("status" IN ('prepared', 'planned', 'delivered', 'cancelled')),
				CONSTRAINT "order_deliveries_package_count_check" CHECK ("package_count" > 0),
				CONSTRAINT "PK_order_deliveries_id" PRIMARY KEY ("id")
			)
		`);
		await queryRunner.query(`
			CREATE TABLE "order_delivery_lines" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"delivery_id" uuid NOT NULL,
				"order_line_id" uuid NOT NULL,
				"quantity" integer NOT NULL,
				CONSTRAINT "order_delivery_lines_quantity_check" CHECK ("quantity" > 0),
				CONSTRAINT "order_delivery_lines_delivery_line_unique" UNIQUE ("delivery_id", "order_line_id"),
				CONSTRAINT "PK_order_delivery_lines_id" PRIMARY KEY ("id")
			)
		`);
		await queryRunner.query(`CREATE INDEX "order_deliveries_order_id_index" ON "order_deliveries" ("order_id")`);
		await queryRunner.query(`CREATE INDEX "order_deliveries_commercial_id_index" ON "order_deliveries" ("commercial_id")`);
		await queryRunner.query(`CREATE INDEX "order_deliveries_delivery_visit_id_index" ON "order_deliveries" ("delivery_visit_id")`);
		await queryRunner.query(`CREATE INDEX "order_deliveries_status_index" ON "order_deliveries" ("status")`);
		await queryRunner.query(`CREATE INDEX "order_deliveries_created_at_index" ON "order_deliveries" ("created_at")`);
		await queryRunner.query(`CREATE INDEX "order_delivery_lines_delivery_id_index" ON "order_delivery_lines" ("delivery_id")`);
		await queryRunner.query(`CREATE INDEX "order_delivery_lines_order_line_id_index" ON "order_delivery_lines" ("order_line_id")`);
		await queryRunner.query(`
			ALTER TABLE "order_deliveries"
			ADD CONSTRAINT "FK_order_deliveries_order_id"
			FOREIGN KEY ("order_id") REFERENCES "orders"("id")
			ON DELETE CASCADE ON UPDATE CASCADE
		`);
		await queryRunner.query(`
			ALTER TABLE "order_deliveries"
			ADD CONSTRAINT "FK_order_deliveries_commercial_id"
			FOREIGN KEY ("commercial_id") REFERENCES "commercials"("id")
			ON DELETE RESTRICT ON UPDATE CASCADE
		`);
		await queryRunner.query(`
			ALTER TABLE "order_deliveries"
			ADD CONSTRAINT "FK_order_deliveries_delivery_visit_id"
			FOREIGN KEY ("delivery_visit_id") REFERENCES "commercial_visits"("id")
			ON DELETE SET NULL ON UPDATE CASCADE
		`);
		await queryRunner.query(`
			ALTER TABLE "order_deliveries"
			ADD CONSTRAINT "FK_order_deliveries_delivered_by_user_id"
			FOREIGN KEY ("delivered_by_user_id") REFERENCES "users"("id")
			ON DELETE SET NULL ON UPDATE CASCADE
		`);
		await queryRunner.query(`
			ALTER TABLE "order_deliveries"
			ADD CONSTRAINT "FK_order_deliveries_created_by_user_id"
			FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
			ON DELETE SET NULL ON UPDATE CASCADE
		`);
		await queryRunner.query(`
			ALTER TABLE "order_delivery_lines"
			ADD CONSTRAINT "FK_order_delivery_lines_delivery_id"
			FOREIGN KEY ("delivery_id") REFERENCES "order_deliveries"("id")
			ON DELETE CASCADE ON UPDATE CASCADE
		`);
		await queryRunner.query(`
			ALTER TABLE "order_delivery_lines"
			ADD CONSTRAINT "FK_order_delivery_lines_order_line_id"
			FOREIGN KEY ("order_line_id") REFERENCES "order_lines"("id")
			ON DELETE RESTRICT ON UPDATE CASCADE
		`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`ALTER TABLE "order_delivery_lines" DROP CONSTRAINT "FK_order_delivery_lines_order_line_id"`);
		await queryRunner.query(`ALTER TABLE "order_delivery_lines" DROP CONSTRAINT "FK_order_delivery_lines_delivery_id"`);
		await queryRunner.query(`ALTER TABLE "order_deliveries" DROP CONSTRAINT "FK_order_deliveries_created_by_user_id"`);
		await queryRunner.query(`ALTER TABLE "order_deliveries" DROP CONSTRAINT "FK_order_deliveries_delivered_by_user_id"`);
		await queryRunner.query(`ALTER TABLE "order_deliveries" DROP CONSTRAINT "FK_order_deliveries_delivery_visit_id"`);
		await queryRunner.query(`ALTER TABLE "order_deliveries" DROP CONSTRAINT "FK_order_deliveries_commercial_id"`);
		await queryRunner.query(`ALTER TABLE "order_deliveries" DROP CONSTRAINT "FK_order_deliveries_order_id"`);
		await queryRunner.query(`DROP INDEX "order_delivery_lines_order_line_id_index"`);
		await queryRunner.query(`DROP INDEX "order_delivery_lines_delivery_id_index"`);
		await queryRunner.query(`DROP INDEX "order_deliveries_created_at_index"`);
		await queryRunner.query(`DROP INDEX "order_deliveries_status_index"`);
		await queryRunner.query(`DROP INDEX "order_deliveries_delivery_visit_id_index"`);
		await queryRunner.query(`DROP INDEX "order_deliveries_commercial_id_index"`);
		await queryRunner.query(`DROP INDEX "order_deliveries_order_id_index"`);
		await queryRunner.query(`DROP TABLE "order_delivery_lines"`);
		await queryRunner.query(`DROP TABLE "order_deliveries"`);
    }

}
