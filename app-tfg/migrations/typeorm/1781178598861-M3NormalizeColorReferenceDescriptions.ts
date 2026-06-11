import { MigrationInterface, QueryRunner } from "typeorm";

export class M3NormalizeColorReferenceDescriptions1781178598861
	implements MigrationInterface
{
	name = "M3NormalizeColorReferenceDescriptions1781178598861";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			UPDATE "color_references"
			SET "description" = replace(
				replace("description", 'fantas??a', 'fantas' || chr(237) || 'a'),
				'fantas?a',
				'fantas' || chr(237) || 'a'
			)
			WHERE "description" LIKE '%fantas??a%'
				OR "description" LIKE '%fantas?a%'
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			UPDATE "color_references"
			SET "description" = replace(
				"description",
				'fantas' || chr(237) || 'a',
				'fantas??a'
			)
			WHERE "description" LIKE '%' || 'fantas' || chr(237) || 'a Candy Colors%'
		`);
	}

}
