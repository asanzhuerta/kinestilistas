import { MigrationInterface, QueryRunner } from "typeorm";

export class M3AddThumbImageUrlToColorReferences1777882716385 implements MigrationInterface {

	name = "M3AddThumbImageUrlToColorReferences1777882716385";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "color_references"
			ADD COLUMN "thumb_image_url" text
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "color_references"
			DROP COLUMN "thumb_image_url"
		`);
	}
}
