import { MigrationInterface, QueryRunner } from "typeorm";

export class M2AddClientGeodata1776634089211 implements MigrationInterface {
	name = "M2AddClientGeodata1776634089211";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "clients"
			ADD COLUMN "lat" numeric(9,6),
			ADD COLUMN "lng" numeric(9,6)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "clients"
			DROP COLUMN "lng",
			DROP COLUMN "lat"
		`);
	}
}
