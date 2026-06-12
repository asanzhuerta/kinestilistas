import { MigrationInterface, QueryRunner } from "typeorm";

export class M7NotificationDeliveryChannels1781257362729
	implements MigrationInterface
{
	name = "M7NotificationDeliveryChannels1781257362729";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "user_push_subscriptions" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"user_id" uuid NOT NULL,
				"endpoint" text NOT NULL,
				"p256dh" text NOT NULL,
				"auth" text NOT NULL,
				"expiration_time" TIMESTAMPTZ,
				"user_agent" text,
				"last_used_at" TIMESTAMPTZ,
				"revoked_at" TIMESTAMPTZ,
				"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				CONSTRAINT "PK_user_push_subscriptions" PRIMARY KEY ("id"),
				CONSTRAINT "UQ_user_push_subscriptions_endpoint" UNIQUE ("endpoint"),
				CONSTRAINT "FK_user_push_subscriptions_user_id"
					FOREIGN KEY ("user_id") REFERENCES "users"("id")
					ON DELETE CASCADE ON UPDATE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX "user_push_subscriptions_user_id_index"
			ON "user_push_subscriptions" ("user_id")
		`);
		await queryRunner.query(`
			CREATE INDEX "user_push_subscriptions_user_active_index"
			ON "user_push_subscriptions" ("user_id", "revoked_at")
		`);
		await queryRunner.query(`
			INSERT INTO "external_integrations" ("name", "integration_type", "description", "status", "config")
			VALUES
				(
					'SMTP transaccional',
					'messaging',
					'Envio de correos a usuarios desde comunicaciones internas.',
					'not_configured',
					'{"env":["SMTP_HOST","SMTP_PORT","SMTP_USER","SMTP_PASSWORD","SMTP_FROM"]}'::jsonb
				),
				(
					'Web Push PWA',
					'messaging',
					'Notificaciones push a dispositivos con la PWA instalada o permiso de navegador concedido.',
					'not_configured',
					'{"env":["VAPID_PUBLIC_KEY","VAPID_PRIVATE_KEY","VAPID_SUBJECT"]}'::jsonb
				)
			ON CONFLICT ("name") DO NOTHING
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DELETE FROM "external_integrations"
			WHERE "name" IN ('SMTP transaccional', 'Web Push PWA')
		`);
		await queryRunner.query(`DROP INDEX "user_push_subscriptions_user_active_index"`);
		await queryRunner.query(`DROP INDEX "user_push_subscriptions_user_id_index"`);
		await queryRunner.query(`DROP TABLE "user_push_subscriptions"`);
	}

}
