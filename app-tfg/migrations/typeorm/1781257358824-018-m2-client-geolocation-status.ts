import { MigrationInterface, QueryRunner } from "typeorm";

export class M2ClientGeolocationStatus1781257358824
	implements MigrationInterface
{
	name = "M2ClientGeolocationStatus1781257358824";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "clients"
			ADD COLUMN "geolocation_status" text NOT NULL DEFAULT 'pending',
			ADD COLUMN "geolocation_verified_at" TIMESTAMP WITH TIME ZONE
		`);

		await queryRunner.query(`
			UPDATE "clients"
			SET
				"geolocation_status" = 'verified',
				"geolocation_verified_at" = NOW()
			WHERE "lat" IS NOT NULL
			  AND "lng" IS NOT NULL
		`);

		await queryRunner.query(`
			ALTER TABLE "clients"
			ADD CONSTRAINT "CHK_clients_geolocation_status"
			CHECK ("geolocation_status" IN ('pending', 'verified'))
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "clients"
			DROP CONSTRAINT "CHK_clients_geolocation_status"
		`);

		await queryRunner.query(`
			ALTER TABLE "clients"
			DROP COLUMN "geolocation_verified_at",
			DROP COLUMN "geolocation_status"
		`);
	}

}
