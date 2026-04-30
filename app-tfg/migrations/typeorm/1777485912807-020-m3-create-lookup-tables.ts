import { MigrationInterface, QueryRunner } from "typeorm";

export class M3CreateLookupTables1777485912807
	implements MigrationInterface
{
	name = "M3CreateLookupTables1777485912807";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "product_statuses" (
				"id" smallint NOT NULL,
				"code" text NOT NULL,
				"name" text NOT NULL,
				CONSTRAINT "UQ_product_statuses_code" UNIQUE ("code"),
				CONSTRAINT "UQ_product_statuses_name" UNIQUE ("name"),
				CONSTRAINT "PK_product_statuses" PRIMARY KEY ("id")
			)
		`);

		await queryRunner.query(`
			CREATE TABLE "support_resource_types" (
				"id" smallint NOT NULL,
				"code" text NOT NULL,
				"name" text NOT NULL,
				CONSTRAINT "UQ_support_resource_types_code" UNIQUE ("code"),
				CONSTRAINT "UQ_support_resource_types_name" UNIQUE ("name"),
				CONSTRAINT "PK_support_resource_types" PRIMARY KEY ("id")
			)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "support_resource_types"`);
		await queryRunner.query(`DROP TABLE "product_statuses"`);
	}
}
