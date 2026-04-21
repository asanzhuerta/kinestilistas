import { MigrationInterface, QueryRunner } from "typeorm";

export class M2DropAssignedCommercialFromClients1775731399486 implements MigrationInterface {
	name = "M2DropAssignedCommercialFromClients1775731399486";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "clients"
			DROP CONSTRAINT "FK_clients_assigned_commercial_id"
		`);

		await queryRunner.query(`
			DROP INDEX "public"."clients_assigned_commercial_id_index"
		`);

		await queryRunner.query(`
			ALTER TABLE "clients"
			DROP COLUMN "assigned_commercial_id"
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "clients"
			ADD COLUMN "assigned_commercial_id" uuid
		`);

		await queryRunner.query(`
			CREATE INDEX "clients_assigned_commercial_id_index"
			ON "clients" ("assigned_commercial_id")
		`);

		await queryRunner.query(`
			ALTER TABLE "clients"
			ADD CONSTRAINT "FK_clients_assigned_commercial_id"
			FOREIGN KEY ("assigned_commercial_id")
			REFERENCES "users"("id")
			ON DELETE RESTRICT
			ON UPDATE CASCADE
		`);
	}
}
