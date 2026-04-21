import { MigrationInterface, QueryRunner } from "typeorm";

export class M2RefactorVisitsToDayModel1776765685194
	implements MigrationInterface
{
	name = "M2RefactorVisitsToDayModel1776765685194";

	public async up(queryRunner: QueryRunner): Promise<void> {
		// ----------------------------------------------------------------------
		// clients
		// ----------------------------------------------------------------------
		await queryRunner.query(`
			ALTER TABLE "clients"
			ADD COLUMN "visit_window_start_time" time,
			ADD COLUMN "visit_window_end_time" time
		`);

		await queryRunner.query(`
			ALTER TABLE "clients"
			ADD CONSTRAINT "CHK_clients_visit_window_order"
			CHECK (
				"visit_window_start_time" IS NULL
				OR "visit_window_end_time" IS NULL
				OR "visit_window_start_time" < "visit_window_end_time"
			)
		`);

		// ----------------------------------------------------------------------
		// commercials
		// ----------------------------------------------------------------------
		await queryRunner.query(`
			ALTER TABLE "commercials"
			ADD COLUMN "delivery_visit_duration_minutes" smallint NOT NULL DEFAULT 10,
			ADD COLUMN "routine_visit_duration_minutes" smallint NOT NULL DEFAULT 35
		`);

		await queryRunner.query(`
			UPDATE "commercials"
			SET "routine_visit_duration_minutes" = COALESCE("max_visit_duration_minutes", 35)
		`);

		await queryRunner.query(`
			ALTER TABLE "commercials"
			ADD CONSTRAINT "CHK_commercials_delivery_visit_duration_minutes"
			CHECK (
				"delivery_visit_duration_minutes" > 0
				AND "delivery_visit_duration_minutes" <= 480
			)
		`);

		await queryRunner.query(`
			ALTER TABLE "commercials"
			ADD CONSTRAINT "CHK_commercials_routine_visit_duration_minutes"
			CHECK (
				"routine_visit_duration_minutes" > 0
				AND "routine_visit_duration_minutes" <= 480
			)
		`);

		await queryRunner.query(`
			ALTER TABLE "commercials"
			DROP CONSTRAINT "CHK_commercials_max_visit_duration_minutes"
		`);

		await queryRunner.query(`
			ALTER TABLE "commercials"
			DROP COLUMN "max_visit_duration_minutes"
		`);

		// ----------------------------------------------------------------------
		// commercial_visits
		// ----------------------------------------------------------------------
		await queryRunner.query(`
			ALTER TABLE "commercial_visits"
			ADD COLUMN "scheduled_for_date" date,
			ADD COLUMN "visit_type_id" smallint
		`);

		await queryRunner.query(`
			UPDATE "commercial_visits"
			SET
				"scheduled_for_date" = ("scheduled_at" AT TIME ZONE 'Europe/Madrid')::date,
				"visit_type_id" = 2
		`);

		await queryRunner.query(`
			ALTER TABLE "commercial_visits"
			ALTER COLUMN "scheduled_for_date" SET NOT NULL
		`);

		await queryRunner.query(`
			ALTER TABLE "commercial_visits"
			ALTER COLUMN "visit_type_id" SET NOT NULL
		`);

		await queryRunner.query(`
			CREATE INDEX "commercial_visits_visit_type_id_index"
			ON "commercial_visits" ("visit_type_id")
		`);

		await queryRunner.query(`
			CREATE INDEX "commercial_visits_scheduled_for_date_index"
			ON "commercial_visits" ("scheduled_for_date")
		`);

		await queryRunner.query(`
			ALTER TABLE "commercial_visits"
			ADD CONSTRAINT "FK_commercial_visits_visit_type_id"
			FOREIGN KEY ("visit_type_id")
			REFERENCES "commercial_visit_types"("id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			DROP INDEX "public"."commercial_visits_scheduled_at_index"
		`);

		await queryRunner.query(`
			ALTER TABLE "commercial_visits"
			DROP COLUMN "scheduled_at"
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		// ----------------------------------------------------------------------
		// commercial_visits
		// ----------------------------------------------------------------------
		await queryRunner.query(`
			ALTER TABLE "commercial_visits"
			ADD COLUMN "scheduled_at" TIMESTAMP WITH TIME ZONE
		`);

		await queryRunner.query(`
			UPDATE "commercial_visits"
			SET "scheduled_at" = ("scheduled_for_date"::timestamp AT TIME ZONE 'Europe/Madrid')
		`);

		await queryRunner.query(`
			ALTER TABLE "commercial_visits"
			ALTER COLUMN "scheduled_at" SET NOT NULL
		`);

		await queryRunner.query(`
			CREATE INDEX "commercial_visits_scheduled_at_index"
			ON "commercial_visits" ("scheduled_at")
		`);

		await queryRunner.query(`
			ALTER TABLE "commercial_visits"
			DROP CONSTRAINT "FK_commercial_visits_visit_type_id"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."commercial_visits_scheduled_for_date_index"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."commercial_visits_visit_type_id_index"
		`);

		await queryRunner.query(`
			ALTER TABLE "commercial_visits"
			DROP COLUMN "visit_type_id",
			DROP COLUMN "scheduled_for_date"
		`);

		// ----------------------------------------------------------------------
		// commercials
		// ----------------------------------------------------------------------
		await queryRunner.query(`
			ALTER TABLE "commercials"
			ADD COLUMN "max_visit_duration_minutes" smallint
		`);

		await queryRunner.query(`
			UPDATE "commercials"
			SET "max_visit_duration_minutes" = COALESCE("routine_visit_duration_minutes", 35)
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

		await queryRunner.query(`
			ALTER TABLE "commercials"
			DROP CONSTRAINT "CHK_commercials_routine_visit_duration_minutes"
		`);

		await queryRunner.query(`
			ALTER TABLE "commercials"
			DROP CONSTRAINT "CHK_commercials_delivery_visit_duration_minutes"
		`);

		await queryRunner.query(`
			ALTER TABLE "commercials"
			DROP COLUMN "routine_visit_duration_minutes",
			DROP COLUMN "delivery_visit_duration_minutes"
		`);

		// ----------------------------------------------------------------------
		// clients
		// ----------------------------------------------------------------------
		await queryRunner.query(`
			ALTER TABLE "clients"
			DROP CONSTRAINT "CHK_clients_visit_window_order"
		`);

		await queryRunner.query(`
			ALTER TABLE "clients"
			DROP COLUMN "visit_window_end_time",
			DROP COLUMN "visit_window_start_time"
		`);
	}
}