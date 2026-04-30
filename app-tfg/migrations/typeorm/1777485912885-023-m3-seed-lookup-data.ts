import { MigrationInterface, QueryRunner } from "typeorm";

export class M3SeedLookupData1777485912885 implements MigrationInterface {
	name = "M3SeedLookupData1777485912885";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			INSERT INTO "product_statuses" ("id", "code", "name")
			VALUES
				(1, 'active', 'Activo'),
				(2, 'inactive', 'Inactivo')
		`);

		await queryRunner.query(`
			INSERT INTO "support_resource_types" ("id", "code", "name")
			VALUES
				(1, 'technical_sheet', 'Ficha técnica'),
				(2, 'commercial_catalog', 'Catálogo comercial'),
				(3, 'training_material', 'Material formativo')
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DELETE FROM "support_resource_types"`);
		await queryRunner.query(`DELETE FROM "product_statuses"`);
	}
}
