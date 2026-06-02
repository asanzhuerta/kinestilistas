import { getDataSource } from "@/lib/typeorm/data-source";
import { AccessEventType } from "@/lib/typeorm/entities/AccessEventType";
import { AccessResultType } from "@/lib/typeorm/entities/AccessResultType";
import { UserAccessLog } from "@/lib/typeorm/entities/UserAccessLog";

type LogAccessEventInput = {
	userId?: string | null;
	emailAttempted?: string | null;
	eventCode: "login_success" | "login_failed";
	resultCode: "success" | "failed";
	failureReason?: string | null;
	sessionToken?: string | null;
	ipAddress?: string | null;
	userAgent?: string | null;
	revokedAt?: Date | null;
	expiresAt?: Date | null;
};

export async function logAccessEvent(input: LogAccessEventInput) {
	try {
		const ds = await getDataSource();

		await ds.transaction(async (manager) => {
			const eventTypeRepo = manager.getRepository(AccessEventType);
			const resultTypeRepo = manager.getRepository(AccessResultType);
			const accessLogRepo = manager.getRepository(UserAccessLog);

			const [eventType, resultType] = await Promise.all([
				eventTypeRepo.findOne({
					where: { code: input.eventCode },
				}),
				resultTypeRepo.findOne({
					where: { code: input.resultCode },
				}),
			]);

			if (!eventType || !resultType) {
				console.error(
					"[login] no se pudieron resolver los catálogos de acceso",
				);
				return;
			}

			const log = accessLogRepo.create({
				user_id: input.userId ?? null,
				email_attempted: input.emailAttempted ?? null,
				event_type_id: eventType.id,
				result_type_id: resultType.id,
				failure_reason: input.failureReason ?? null,
				session_token: input.sessionToken ?? null,
				ip_address: input.ipAddress ?? null,
				user_agent: input.userAgent ?? null,
				revoked_at: input.revokedAt ?? null,
				expires_at: input.expiresAt ?? null,
			});

			await accessLogRepo.save(log);
		});

		return true;
	} catch (error) {
		console.error("[login] error al registrar evento de acceso:", error);
		return false;
	}
}
