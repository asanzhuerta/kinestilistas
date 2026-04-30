import { MigrationInterface, QueryRunner } from "typeorm";

export class M2AddPostponedVisitStatus1777114131000
	implements MigrationInterface
{
	name = "M2AddPostponedVisitStatus1777114131000";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			INSERT INTO "commercial_visit_statuses" ("id", "code", "name")
			SELECT 4, 'postponed', 'Aplazada'
			WHERE NOT EXISTS (
				SELECT 1
				FROM "commercial_visit_statuses"
				WHERE "id" = 4
					OR "code" = 'postponed'
					OR "name" = 'Aplazada'
			)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DELETE FROM "commercial_visit_statuses"
			WHERE "id" = 4
				OR "code" = 'postponed'
		`);
	}
}
