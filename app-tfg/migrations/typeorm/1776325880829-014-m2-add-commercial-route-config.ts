import { MigrationInterface, QueryRunner } from "typeorm";

export class M2AddCommercialRouteConfig1776325880829
	implements MigrationInterface
{
	name = "M2AddCommercialRouteConfig1776325880829";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "commercials"
			ADD COLUMN "workday_start_time" time,
			ADD COLUMN "workday_end_time" time,
			ADD COLUMN "max_visit_duration_minutes" smallint,
			ADD COLUMN "route_start_address" text,
			ADD COLUMN "route_end_address" text,
			ADD COLUMN "return_to_start" boolean NOT NULL DEFAULT true,
			ADD COLUMN "route_start_lat" numeric(9,6),
			ADD COLUMN "route_start_lng" numeric(9,6),
			ADD COLUMN "route_end_lat" numeric(9,6),
			ADD COLUMN "route_end_lng" numeric(9,6)
		`);

		await queryRunner.query(`
			ALTER TABLE "commercials"
			ADD CONSTRAINT "CHK_commercials_max_visit_duration_minutes"
			CHECK (
				"max_visit_duration_minutes" IS NULL
				OR (
					"max_visit_duration_minutes" > 0
					AND "max_visit_duration_minutes" <= 480
				)
			)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "commercials"
			DROP CONSTRAINT "CHK_commercials_max_visit_duration_minutes"
		`);

		await queryRunner.query(`
			ALTER TABLE "commercials"
			DROP COLUMN "route_end_lng",
			DROP COLUMN "route_end_lat",
			DROP COLUMN "route_start_lng",
			DROP COLUMN "route_start_lat",
			DROP COLUMN "return_to_start",
			DROP COLUMN "route_end_address",
			DROP COLUMN "route_start_address",
			DROP COLUMN "max_visit_duration_minutes",
			DROP COLUMN "workday_end_time",
			DROP COLUMN "workday_start_time"
		`);
	}
}