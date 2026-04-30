import { MigrationInterface, QueryRunner } from "typeorm";

export class M3AddProductFormatAndPacking1777548660844
	implements MigrationInterface
{
	name = "M3AddProductFormatAndPacking1777548660844";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			ALTER TABLE "products"
			ADD COLUMN "format" text
		`);

		await queryRunner.query(`
			ALTER TABLE "products"
			ADD COLUMN "packing" integer
		`);

		await queryRunner.query(`
			ALTER TABLE "products"
			ADD CONSTRAINT "CHK_products_packing_non_negative"
			CHECK ("packing" IS NULL OR "packing" >= 0)
		`);

		await queryRunner.query(`
			UPDATE "products"
			SET
				"format" = COALESCE(
					"format",
					NULLIF(
						BTRIM(
							(REGEXP_MATCH(COALESCE("technical_info", ''), E'(?mi)^Formato:\\s*(.+?)\\s*$'))[1]
						),
						''
					)
				),
				"packing" = COALESCE(
					"packing",
					NULLIF(
						(REGEXP_MATCH(COALESCE("technical_info", ''), E'(?mi)^Packing:\\s*([0-9]+)\\s*$'))[1],
						''
					)::integer
				),
				"technical_info" = NULLIF(
					BTRIM(
						REGEXP_REPLACE(
							REGEXP_REPLACE(
								REGEXP_REPLACE(
									COALESCE("technical_info", ''),
									E'(?mi)^Formato:\\s*.+(?:\\r?\\n)?',
									'',
									'g'
								),
								E'(?mi)^Packing:\\s*.+(?:\\r?\\n)?',
								'',
								'g'
							),
							E'(\\r?\\n){3,}',
							E'\\n\\n',
							'g'
						),
						E'\\r\\n '
					),
					''
				)
			WHERE "technical_info" IS NOT NULL
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			UPDATE "products"
			SET "technical_info" = NULLIF(
				CONCAT_WS(
					E'\\n',
					NULLIF("technical_info", ''),
					CASE
						WHEN "format" IS NOT NULL THEN CONCAT('Formato: ', "format")
						ELSE NULL
					END,
					CASE
						WHEN "packing" IS NOT NULL THEN CONCAT('Packing: ', "packing"::text)
						ELSE NULL
					END
				),
				''
			)
			WHERE "format" IS NOT NULL OR "packing" IS NOT NULL
		`);

		await queryRunner.query(`
			ALTER TABLE "products"
			DROP CONSTRAINT "CHK_products_packing_non_negative"
		`);

		await queryRunner.query(`
			ALTER TABLE "products"
			DROP COLUMN "packing"
		`);

		await queryRunner.query(`
			ALTER TABLE "products"
			DROP COLUMN "format"
		`);
	}
}
