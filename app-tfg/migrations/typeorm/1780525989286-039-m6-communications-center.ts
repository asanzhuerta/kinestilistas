import { MigrationInterface, QueryRunner } from "typeorm";

export class M6CommunicationsCenter1780525989286
	implements MigrationInterface
{
	name = "M6CommunicationsCenter1780525989286";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "customer_segments" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"code" text NOT NULL,
				"name" text NOT NULL,
				"description" text,
				"criteria" text,
				"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				CONSTRAINT "PK_customer_segments" PRIMARY KEY ("id"),
				CONSTRAINT "UQ_customer_segments_code" UNIQUE ("code")
			)
		`);
		await queryRunner.query(`
			CREATE INDEX "customer_segments_name_index"
			ON "customer_segments" ("name")
		`);
		await queryRunner.query(`
			CREATE TABLE "client_customer_segments" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"client_id" uuid NOT NULL,
				"segment_id" uuid NOT NULL,
				"assigned_by_user_id" uuid,
				"notes" text,
				"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				CONSTRAINT "PK_client_customer_segments" PRIMARY KEY ("id"),
				CONSTRAINT "UQ_client_customer_segments_client_segment"
					UNIQUE ("client_id", "segment_id"),
				CONSTRAINT "FK_client_customer_segments_client_id"
					FOREIGN KEY ("client_id") REFERENCES "clients"("id")
					ON DELETE CASCADE ON UPDATE CASCADE,
				CONSTRAINT "FK_client_customer_segments_segment_id"
					FOREIGN KEY ("segment_id") REFERENCES "customer_segments"("id")
					ON DELETE CASCADE ON UPDATE CASCADE,
				CONSTRAINT "FK_client_customer_segments_assigned_by_user_id"
					FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id")
					ON DELETE SET NULL ON UPDATE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX "client_customer_segments_client_id_index"
			ON "client_customer_segments" ("client_id")
		`);
		await queryRunner.query(`
			CREATE INDEX "client_customer_segments_segment_id_index"
			ON "client_customer_segments" ("segment_id")
		`);
		await queryRunner.query(`
			CREATE TABLE "promotions" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"title" text NOT NULL,
				"description" text NOT NULL,
				"promotion_type" text NOT NULL,
				"benefit" text NOT NULL,
				"start_date" date NOT NULL,
				"end_date" date NOT NULL,
				"status" text NOT NULL DEFAULT 'draft',
				"product_id" uuid,
				"product_line_id" uuid,
				"client_id" uuid,
				"customer_segment_id" uuid,
				"created_by_user_id" uuid,
				"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				CONSTRAINT "PK_promotions" PRIMARY KEY ("id"),
				CONSTRAINT "CHK_promotions_status"
					CHECK ("status" IN ('draft', 'active', 'archived')),
				CONSTRAINT "CHK_promotions_dates"
					CHECK ("end_date" >= "start_date"),
				CONSTRAINT "FK_promotions_product_id"
					FOREIGN KEY ("product_id") REFERENCES "products"("id")
					ON DELETE SET NULL ON UPDATE CASCADE,
				CONSTRAINT "FK_promotions_product_line_id"
					FOREIGN KEY ("product_line_id") REFERENCES "product_lines"("id")
					ON DELETE SET NULL ON UPDATE CASCADE,
				CONSTRAINT "FK_promotions_client_id"
					FOREIGN KEY ("client_id") REFERENCES "clients"("id")
					ON DELETE SET NULL ON UPDATE CASCADE,
				CONSTRAINT "FK_promotions_customer_segment_id"
					FOREIGN KEY ("customer_segment_id") REFERENCES "customer_segments"("id")
					ON DELETE SET NULL ON UPDATE CASCADE,
				CONSTRAINT "FK_promotions_created_by_user_id"
					FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
					ON DELETE SET NULL ON UPDATE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX "promotions_status_index"
			ON "promotions" ("status")
		`);
		await queryRunner.query(`
			CREATE INDEX "promotions_start_end_date_index"
			ON "promotions" ("start_date", "end_date")
		`);
		await queryRunner.query(`
			CREATE INDEX "promotions_client_id_index"
			ON "promotions" ("client_id")
		`);
		await queryRunner.query(`
			CREATE INDEX "promotions_customer_segment_id_index"
			ON "promotions" ("customer_segment_id")
		`);
		await queryRunner.query(`
			CREATE TABLE "training_events" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"title" text NOT NULL,
				"description" text NOT NULL,
				"starts_at" TIMESTAMPTZ NOT NULL,
				"location" text,
				"modality" text NOT NULL DEFAULT 'in_person',
				"content" text,
				"status" text NOT NULL DEFAULT 'draft',
				"capacity" integer,
				"created_by_user_id" uuid,
				"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				CONSTRAINT "PK_training_events" PRIMARY KEY ("id"),
				CONSTRAINT "CHK_training_events_status"
					CHECK ("status" IN ('draft', 'published', 'cancelled', 'completed')),
				CONSTRAINT "CHK_training_events_modality"
					CHECK ("modality" IN ('in_person', 'online', 'hybrid')),
				CONSTRAINT "CHK_training_events_capacity_positive"
					CHECK ("capacity" IS NULL OR "capacity" > 0),
				CONSTRAINT "FK_training_events_created_by_user_id"
					FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
					ON DELETE SET NULL ON UPDATE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX "training_events_status_index"
			ON "training_events" ("status")
		`);
		await queryRunner.query(`
			CREATE INDEX "training_events_starts_at_index"
			ON "training_events" ("starts_at")
		`);
		await queryRunner.query(`
			CREATE TABLE "training_enrollments" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"training_event_id" uuid NOT NULL,
				"user_id" uuid NOT NULL,
				"status" text NOT NULL DEFAULT 'registered',
				"notes" text,
				"enrolled_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				CONSTRAINT "PK_training_enrollments" PRIMARY KEY ("id"),
				CONSTRAINT "UQ_training_enrollments_event_user"
					UNIQUE ("training_event_id", "user_id"),
				CONSTRAINT "CHK_training_enrollments_status"
					CHECK ("status" IN ('registered', 'cancelled', 'attended')),
				CONSTRAINT "FK_training_enrollments_training_event_id"
					FOREIGN KEY ("training_event_id") REFERENCES "training_events"("id")
					ON DELETE CASCADE ON UPDATE CASCADE,
				CONSTRAINT "FK_training_enrollments_user_id"
					FOREIGN KEY ("user_id") REFERENCES "users"("id")
					ON DELETE CASCADE ON UPDATE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX "training_enrollments_training_event_id_index"
			ON "training_enrollments" ("training_event_id")
		`);
		await queryRunner.query(`
			CREATE INDEX "training_enrollments_user_id_index"
			ON "training_enrollments" ("user_id")
		`);
		await queryRunner.query(`
			CREATE TABLE "app_notifications" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"recipient_user_id" uuid NOT NULL,
				"title" text NOT NULL,
				"body" text NOT NULL,
				"notification_type" text NOT NULL,
				"channel" text NOT NULL DEFAULT 'in_app',
				"source_type" text,
				"source_id" uuid,
				"read_at" TIMESTAMPTZ,
				"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				CONSTRAINT "PK_app_notifications" PRIMARY KEY ("id"),
				CONSTRAINT "CHK_app_notifications_channel"
					CHECK ("channel" IN ('in_app')),
				CONSTRAINT "FK_app_notifications_recipient_user_id"
					FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id")
					ON DELETE CASCADE ON UPDATE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX "app_notifications_recipient_user_id_index"
			ON "app_notifications" ("recipient_user_id")
		`);
		await queryRunner.query(`
			CREATE INDEX "app_notifications_recipient_unread_index"
			ON "app_notifications" ("recipient_user_id", "read_at")
		`);
		await queryRunner.query(`
			CREATE TABLE "app_reminders" (
				"id" uuid NOT NULL DEFAULT uuid_generate_v4(),
				"recipient_user_id" uuid NOT NULL,
				"title" text NOT NULL,
				"body" text NOT NULL,
				"scheduled_at" TIMESTAMPTZ NOT NULL,
				"status" text NOT NULL DEFAULT 'pending',
				"source_type" text,
				"source_id" uuid,
				"created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
				CONSTRAINT "PK_app_reminders" PRIMARY KEY ("id"),
				CONSTRAINT "CHK_app_reminders_status"
					CHECK ("status" IN ('pending', 'done', 'cancelled')),
				CONSTRAINT "FK_app_reminders_recipient_user_id"
					FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id")
					ON DELETE CASCADE ON UPDATE CASCADE
			)
		`);
		await queryRunner.query(`
			CREATE INDEX "app_reminders_recipient_user_id_index"
			ON "app_reminders" ("recipient_user_id")
		`);
		await queryRunner.query(`
			CREATE INDEX "app_reminders_scheduled_at_index"
			ON "app_reminders" ("scheduled_at")
		`);
		await queryRunner.query(`
			INSERT INTO "customer_segments" ("code", "name", "description", "criteria")
			VALUES
				('platinum', 'Platino', 'Clientes de mayor actividad y prioridad comercial.', 'Segmento gestionado manualmente por administracion.'),
				('gold', 'Oro', 'Clientes con uso frecuente de la plataforma y relacion comercial estable.', 'Segmento gestionado manualmente por administracion.'),
				('silver', 'Plata', 'Clientes activos con seguimiento comercial ordinario.', 'Segmento gestionado manualmente por administracion.')
			ON CONFLICT ("code") DO NOTHING
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`DROP INDEX "app_reminders_scheduled_at_index"`);
		await queryRunner.query(`DROP INDEX "app_reminders_recipient_user_id_index"`);
		await queryRunner.query(`DROP TABLE "app_reminders"`);
		await queryRunner.query(`DROP INDEX "app_notifications_recipient_unread_index"`);
		await queryRunner.query(`DROP INDEX "app_notifications_recipient_user_id_index"`);
		await queryRunner.query(`DROP TABLE "app_notifications"`);
		await queryRunner.query(`DROP INDEX "training_enrollments_user_id_index"`);
		await queryRunner.query(`DROP INDEX "training_enrollments_training_event_id_index"`);
		await queryRunner.query(`DROP TABLE "training_enrollments"`);
		await queryRunner.query(`DROP INDEX "training_events_starts_at_index"`);
		await queryRunner.query(`DROP INDEX "training_events_status_index"`);
		await queryRunner.query(`DROP TABLE "training_events"`);
		await queryRunner.query(`DROP INDEX "promotions_customer_segment_id_index"`);
		await queryRunner.query(`DROP INDEX "promotions_client_id_index"`);
		await queryRunner.query(`DROP INDEX "promotions_start_end_date_index"`);
		await queryRunner.query(`DROP INDEX "promotions_status_index"`);
		await queryRunner.query(`DROP TABLE "promotions"`);
		await queryRunner.query(`DROP INDEX "client_customer_segments_segment_id_index"`);
		await queryRunner.query(`DROP INDEX "client_customer_segments_client_id_index"`);
		await queryRunner.query(`DROP TABLE "client_customer_segments"`);
		await queryRunner.query(`DROP INDEX "customer_segments_name_index"`);
		await queryRunner.query(`DROP TABLE "customer_segments"`);
	}
}
