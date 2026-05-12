import { MigrationInterface, QueryRunner } from "typeorm";

export class M4CreateLookupTables1778603405101
	implements MigrationInterface
{
	name = "M4CreateLookupTables1778603405101";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "order_statuses" (
				"id" smallint NOT NULL,
				"code" text NOT NULL,
				"name" text NOT NULL,
				CONSTRAINT "UQ_order_statuses_code" UNIQUE ("code"),
				CONSTRAINT "UQ_order_statuses_name" UNIQUE ("name"),
				CONSTRAINT "PK_order_statuses" PRIMARY KEY ("id")
			)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP TABLE "order_statuses"`);
	}
}
