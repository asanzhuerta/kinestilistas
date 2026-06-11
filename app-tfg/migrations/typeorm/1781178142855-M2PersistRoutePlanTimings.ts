import { MigrationInterface, QueryRunner } from "typeorm";

export class M2PersistRoutePlanTimings1781178142855
	implements MigrationInterface
{
	name = "M2PersistRoutePlanTimings1781178142855";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "commercial_routes"
			ADD COLUMN "planning_signature" text,
			ADD COLUMN "planned_start_time" time,
			ADD COLUMN "route_plan" jsonb,
			ADD COLUMN "planned_at" TIMESTAMP WITH TIME ZONE
		`);

		await queryRunner.query(`
			CREATE INDEX "commercial_routes_commercial_id_route_date_index"
			ON "commercial_routes" ("commercial_id", "route_date")
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DROP INDEX IF EXISTS "public"."commercial_routes_commercial_id_route_date_index"
		`);

		await queryRunner.query(`
			ALTER TABLE "commercial_routes"
			DROP COLUMN "planned_at",
			DROP COLUMN "route_plan",
			DROP COLUMN "planned_start_time",
			DROP COLUMN "planning_signature"
		`);
	}
}
