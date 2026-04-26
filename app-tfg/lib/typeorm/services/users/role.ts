import { getDataSource } from "@/lib/typeorm/data-source";
import { Role } from "@/lib/typeorm/entities/Role";
import { User } from "@/lib/typeorm/entities/User";
import { UserManagementLog } from "@/lib/typeorm/entities/UserManagementLog";
import { USER_ADMIN_ACTION_TYPE_IDS } from "@/lib/typeorm/constants/catalog-ids";

export async function listRoles() {
	const ds = await getDataSource();
	const repo = ds.getRepository(Role);

	return repo.find({
		order: {
			id: "ASC",
		},
	});
}

type UpdateUserRoleInput = {
	userId: string;
	newRoleId: number;
	performedByUserId: string;
	reason?: string | null;
	notes?: string | null;
};

export class UpdateUserRoleError extends Error {
	status: number;
	code: string;

	constructor(message: string, status = 400, code = "UPDATE_USER_ROLE_ERROR") {
		super(message);
		this.name = "UpdateUserRoleError";
		this.status = status;
		this.code = code;
	}
}

export async function updateUserRole(input: UpdateUserRoleInput) {
	const ds = await getDataSource();

	return ds.transaction(async (manager) => {
		const userRepo = manager.getRepository(User);
		const roleRepo = manager.getRepository(Role);
		const logRepo = manager.getRepository(UserManagementLog);

		const [user, nextRole] = await Promise.all([
			userRepo.findOne({
				where: { id: input.userId },
				relations: {
					role: true,
					status: true,
				},
			}),
			roleRepo.findOne({
				where: { id: input.newRoleId },
			}),
		]);

		if (!user) {
			throw new UpdateUserRoleError(
				"Usuario no encontrado",
				404,
				"USER_NOT_FOUND",
			);
		}

		if (!nextRole) {
			throw new UpdateUserRoleError(
				"Rol no encontrado",
				404,
				"ROLE_NOT_FOUND",
			);
		}

		if (user.role_id === input.newRoleId) {
			return user;
		}

		const previousRoleId = user.role_id;
		user.role_id = input.newRoleId;
		await userRepo.save(user);

		const log = logRepo.create({
			target_user_id: user.id,
			performed_by: input.performedByUserId,
			action_type_id: USER_ADMIN_ACTION_TYPE_IDS.ROLE_CHANGE,
			previous_status_id: null,
			new_status_id: null,
			previous_role_id: previousRoleId,
			new_role_id: input.newRoleId,
			reason: input.reason ?? null,
			notes: input.notes ?? "Cambio de rol realizado por administrador",
		});

		await logRepo.save(log);

		return userRepo.findOne({
			where: { id: user.id },
			relations: {
				role: true,
				status: true,
			},
		});
	});
}
