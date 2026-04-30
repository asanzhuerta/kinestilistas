import { MigrationInterface, QueryRunner } from "typeorm";

export class M3AddProductSubcategory1777540899633
	implements MigrationInterface
{
	name = "M3AddProductSubcategory1777540899633";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "products"
			ADD COLUMN "subcategory" text
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "products"
			DROP COLUMN "subcategory"
		`);
	}
}
