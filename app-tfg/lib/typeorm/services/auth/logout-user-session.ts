import { getDataSource } from "@/lib/typeorm/data-source";
import { AccessEventType } from "@/lib/typeorm/entities/AccessEventType";
import { AccessResultType } from "@/lib/typeorm/entities/AccessResultType";
import { UserAccessLog } from "@/lib/typeorm/entities/UserAccessLog";
import { cachePersistedAccessSessionState } from "./access-session";

type LogoutUserSessionInput = {
	sessionToken: string;
	userId?: string | null;
	emailAttempted?: string | null;
	logoutAt?: Date;
};

export async function logoutUserSession(input: LogoutUserSessionInput) {
	const ds = await getDataSource();

	return ds.transaction(async (manager) => {
		const eventTypeRepo = manager.getRepository(AccessEventType);
		const resultTypeRepo = manager.getRepository(AccessResultType);
		const accessLogRepo = manager.getRepository(UserAccessLog);

		const now = input.logoutAt ?? new Date();

		const [logoutEventType, successResultType] = await Promise.all([
			eventTypeRepo.findOne({
				where: { code: "logout" },
			}),
			resultTypeRepo.findOne({
				where: { code: "success" },
			}),
		]);

		if (!logoutEventType || !successResultType) {
			throw new Error("No se pudieron resolver los catálogos de logout");
		}

		await accessLogRepo
			.createQueryBuilder()
			.update()
			.set({
				revoked_at: now,
			})
			.where("session_token = :sessionToken", {
				sessionToken: input.sessionToken,
			})
			.andWhere("revoked_at IS NULL")
			.execute();

		await accessLogRepo
			.createQueryBuilder()
			.insert()
			.values({
				user_id: input.userId ?? null,
				email_attempted: input.emailAttempted ?? null,
				event_type_id: logoutEventType.id,
				result_type_id: successResultType.id,
				failure_reason: null,
				session_token: input.sessionToken,
				ip_address: null,
				user_agent: null,
				created_at: now,
				revoked_at: now,
				expires_at: null,
			})
			.execute();

		cachePersistedAccessSessionState(
			input.sessionToken,
			input.userId ?? null,
			false,
		);

		return { ok: true };
	});
}
