import { MigrationInterface, QueryRunner } from "typeorm";

export class M2CreateCommercialVisitTypes1776765672352
	implements MigrationInterface
{
	name = "M2CreateCommercialVisitTypes1776765672352";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "commercial_visit_types" (
				"id" smallint NOT NULL,
				"code" text NOT NULL,
				"name" text NOT NULL,
				CONSTRAINT "UQ_commercial_visit_types_code" UNIQUE ("code"),
				CONSTRAINT "UQ_commercial_visit_types_name" UNIQUE ("name"),
				CONSTRAINT "PK_commercial_visit_types" PRIMARY KEY ("id")
			)
		`);

		await queryRunner.query(`
			INSERT INTO "commercial_visit_types" ("id", "code", "name")
			VALUES
				(1, 'delivery', 'Reparto'),
				(2, 'routine', 'Rutinaria')
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DELETE FROM "commercial_visit_types"`);
		await queryRunner.query(`DROP TABLE "commercial_visit_types"`);
	}
}