import { MigrationInterface, QueryRunner } from "typeorm";

export class M7CreateAppRateLimitPolicies1781257360248
	implements MigrationInterface
{
	name = "M7CreateAppRateLimitPolicies1781257360248";

	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			CREATE TABLE "app_rate_limit_policies" (
				"policy_name" text NOT NULL,
				"enabled" boolean NOT NULL DEFAULT true,
				"max_requests" integer NOT NULL,
				"window_ms" integer NOT NULL,
				"created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				"updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
				CONSTRAINT "PK_app_rate_limit_policies" PRIMARY KEY ("policy_name")
			)
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DROP TABLE "app_rate_limit_policies"
		`);
	}

}
