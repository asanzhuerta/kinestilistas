import { MigrationInterface } from "typeorm";
import { QueryRunner } from "typeorm";

export class M1SeedDefaultUsers1774469861555 implements MigrationInterface {
	name = "M1SeedDefaultUsers1774469861555";
	// Passwords:
	// Admin: admin
	// Cambiar contraseña de cliente y comercial desde admin
	public async up(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			INSERT INTO public.users (
				id,
				email,
				password_hash,
				name,
				phone,
				company,
				role_id,
				status_id,
				profile_image_url,
				last_login_at,
				created_at,
				updated_at
			)
			VALUES
			(
				'6196bfeb-c745-4a7b-8735-23a14c124d16',
				'cliente@email.com',
				'$2b$10$aVHXWMJF5Mkb2oJgc9qTku1N8Kf4e4QdU.t.0DzlMi1FLuMk/9AOy',
				'Cliente',
				NULL,
				'Empresa Cliente',
				3,
				1,
				NULL,
				'2026-03-25 17:43:10.399+00',
				'2026-03-22 22:02:02.813444+00',
				'2026-03-25 17:43:10.399+00'
			),
			(
				'b6c1dac7-f2b0-4347-a53e-f00c1d2b5e4c',
				'admin@email.com',
				'$2b$10$dq1fluYU8g4Gujmyoh1kJ./y2VkOnZI.olCwea9N5/Vpr9xTXkS5q',
				'Admin',
				'603480001',
				NULL,
				1,
				1,
				NULL,
				'2026-03-25 18:04:15.132+00',
				'2026-03-22 22:02:02.813444+00',
				'2026-03-25 18:04:15.132+00'
			),
			(
				'a3d37127-e21e-47b0-8301-cf19b03d4121',
				'comercial@email.com',
				'$2b$10$H3v6ezPX8t3quLhzP01Tj.el7MGqrQLtc7TbhPNxH85zAl9RV09lW',
				'Comercial',
				NULL,
				NULL,
				2,
				1,
				NULL,
				'2026-03-25 18:04:26.71+00',
				'2026-03-22 22:02:02.813444+00',
				'2026-03-25 18:04:26.71+00'
			)
			ON CONFLICT (email) DO NOTHING
		`);
	}

	public async down(queryRunner: QueryRunner): Promise<void> {
		await queryRunner.query(`
			DELETE FROM public.users
			WHERE email IN (
				'cliente@email.com',
				'admin@email.com',
				'comercial@email.com'
			)
		`);
	}
}
