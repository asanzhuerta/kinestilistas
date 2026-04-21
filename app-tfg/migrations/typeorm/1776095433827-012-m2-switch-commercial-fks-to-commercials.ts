import { MigrationInterface, QueryRunner } from "typeorm";

export class M2SwitchCommercialFksToCommercials1776095433827
	implements MigrationInterface
{
	name = "M2SwitchCommercialFksToCommercials1776095433827";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "commercial_visits"
			DROP CONSTRAINT IF EXISTS "FK_commercial_visits_commercial_id"
		`);

		await queryRunner.query(`
			ALTER TABLE "commercial_routes"
			DROP CONSTRAINT IF EXISTS "FK_commercial_routes_commercial_id"
		`);

		await queryRunner.query(`
			ALTER TABLE "commercial_visits"
			ADD CONSTRAINT "FK_commercial_visits_commercial_id"
			FOREIGN KEY ("commercial_id")
			REFERENCES "commercials"("id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			ALTER TABLE "commercial_routes"
			ADD CONSTRAINT "FK_commercial_routes_commercial_id"
			FOREIGN KEY ("commercial_id")
			REFERENCES "commercials"("id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "commercial_visits"
			DROP CONSTRAINT IF EXISTS "FK_commercial_visits_commercial_id"
		`);

		await queryRunner.query(`
			ALTER TABLE "commercial_routes"
			DROP CONSTRAINT IF EXISTS "FK_commercial_routes_commercial_id"
		`);

		await queryRunner.query(`
			ALTER TABLE "commercial_visits"
			ADD CONSTRAINT "FK_commercial_visits_commercial_id"
			FOREIGN KEY ("commercial_id")
			REFERENCES "users"("id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);

		await queryRunner.query(`
			ALTER TABLE "commercial_routes"
			ADD CONSTRAINT "FK_commercial_routes_commercial_id"
			FOREIGN KEY ("commercial_id")
			REFERENCES "users"("id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);
	}
}