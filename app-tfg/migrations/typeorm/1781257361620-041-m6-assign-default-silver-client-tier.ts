import { MigrationInterface, QueryRunner } from "typeorm";

export class M6AssignDefaultSilverClientTier1781257361620
	implements MigrationInterface
{
	name = "M6AssignDefaultSilverClientTier1781257361620";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			INSERT INTO "customer_segments" ("code", "name", "description", "criteria")
			VALUES (
				'silver',
				'Plata',
				'Clientes activos con seguimiento comercial ordinario.',
				'Rango comercial base asignado por defecto.'
			)
			ON CONFLICT ("code") DO UPDATE SET
				"name" = EXCLUDED."name",
				"description" = EXCLUDED."description",
				"criteria" = EXCLUDED."criteria",
				"updated_at" = now()
		`);

		await queryRunner.query(`
			INSERT INTO "client_customer_segments" ("client_id", "segment_id", "notes")
			SELECT
				client."id",
				silver_segment."id",
				'Asignacion automatica de rango base Plata'
			FROM "clients" client
			CROSS JOIN "customer_segments" silver_segment
			WHERE silver_segment."code" = 'silver'
				AND NOT EXISTS (
					SELECT 1
					FROM "client_customer_segments" tier_assignment
					INNER JOIN "customer_segments" tier_segment
						ON tier_segment."id" = tier_assignment."segment_id"
					WHERE tier_assignment."client_id" = client."id"
						AND tier_segment."code" IN ('silver', 'gold', 'platinum')
				)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DELETE FROM "client_customer_segments" assignment
			USING "customer_segments" segment
			WHERE assignment."segment_id" = segment."id"
				AND segment."code" = 'silver'
				AND assignment."notes" = 'Asignacion automatica de rango base Plata'
		`);
	}

}
