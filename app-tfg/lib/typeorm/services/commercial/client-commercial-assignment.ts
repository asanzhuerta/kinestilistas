import { IsNull } from "typeorm";
import { getDataSource } from "@/lib/typeorm/data-source";
import { Client } from "@/lib/typeorm/entities/Client";
import { Commercial } from "@/lib/typeorm/entities/Commercial";
import { ClientCommercialAssignment } from "@/lib/typeorm/entities/ClientCommercialAssignment";
import { normalizeText } from "@/lib/utils/text";

type AssignClientToCommercialInput = {
	clientId: string;
	commercialId: string;
	assignedByUserId?: string | null;
	notes?: string | null;
};

type ReassignClientToCommercialInput = {
	clientId: string;
	commercialId: string;
	assignedByUserId?: string | null;
	notes?: string | null;
};

type UnassignClientFromCommercialInput = {
	clientId: string;
	unassignedByUserId?: string | null;
	notes?: string | null;
};

export class ClientCommercialAssignmentError extends Error {
	status: number;
	code: string;

	constructor(
		message: string,
		status = 400,
		code = "CLIENT_COMMERCIAL_ASSIGNMENT_ERROR",
	) {
		super(message);
		this.name = "ClientCommercialAssignmentError";
		this.status = status;
		this.code = code;
	}
}

export async function getActiveAssignmentByClientId(clientId: string) {
	const ds = await getDataSource();
	const repo = ds.getRepository(ClientCommercialAssignment);

	return repo
		.createQueryBuilder("assignment")
		.leftJoinAndSelect("assignment.client", "client")
		.leftJoinAndSelect("client.user", "user")
		.leftJoinAndSelect("assignment.commercial", "commercial")
		.leftJoinAndSelect("commercial.user", "commercialUser")
		.leftJoinAndSelect("assignment.assignedByUser", "assignedByUser")
		.leftJoinAndSelect("assignment.unassignedByUser", "unassignedByUser")
		.where("assignment.client_id = :clientId", { clientId })
		.andWhere("assignment.unassigned_at IS NULL")
		.orderBy("assignment.assigned_at", "DESC")
		.getOne();
}

export async function getActiveAssignmentByCommercialAndClient(
	commercialId: string,
	clientId: string,
) {
	const ds = await getDataSource();
	const repo = ds.getRepository(ClientCommercialAssignment);

	return repo
		.createQueryBuilder("assignment")
		.leftJoinAndSelect("assignment.client", "client")
		.leftJoinAndSelect("client.user", "user")
		.leftJoinAndSelect("assignment.commercial", "commercial")
		.leftJoinAndSelect("commercial.user", "commercialUser")
		.where("assignment.client_id = :clientId", { clientId })
		.andWhere("assignment.commercial_id = :commercialId", { commercialId })
		.andWhere("assignment.unassigned_at IS NULL")
		.orderBy("assignment.assigned_at", "DESC")
		.getOne();
}

export async function listActiveAssignmentsByCommercialId(
	commercialId: string,
) {
	const ds = await getDataSource();
	const repo = ds.getRepository(ClientCommercialAssignment);

	return repo
		.createQueryBuilder("assignment")
		.leftJoinAndSelect("assignment.client", "client")
		.leftJoinAndSelect("client.user", "user")
		.leftJoinAndSelect("assignment.commercial", "commercial")
		.leftJoinAndSelect("commercial.user", "commercialUser")
		.where("assignment.commercial_id = :commercialId", { commercialId })
		.andWhere("assignment.unassigned_at IS NULL")
		.orderBy("assignment.assigned_at", "DESC")
		.getMany();
}

export async function canCommercialAccessClient(
	commercialId: string,
	clientId: string,
) {
	const activeAssignment = await getActiveAssignmentByCommercialAndClient(
		commercialId,
		clientId,
	);

	return !!activeAssignment;
}

export async function assignClientToCommercial(
	input: AssignClientToCommercialInput,
) {
	const ds = await getDataSource();

	return ds.transaction(async (manager) => {
		const clientRepo = manager.getRepository(Client);
		const commercialRepo = manager.getRepository(Commercial);
		const assignmentRepo = manager.getRepository(ClientCommercialAssignment);

		const [client, commercial, activeAssignment] = await Promise.all([
			clientRepo.findOne({ where: { id: input.clientId } }),
			commercialRepo.findOne({ where: { id: input.commercialId } }),
			assignmentRepo.findOne({
				where: {
					client_id: input.clientId, 
					unassigned_at: IsNull(),
				},
			}),
		]);

		if (!client) {
			throw new ClientCommercialAssignmentError(
				"Cliente no encontrado",
				404,
				"CLIENT_NOT_FOUND",
			);
		}

		if (!commercial) {
			throw new ClientCommercialAssignmentError(
				"Comercial no encontrado",
				404,
				"COMMERCIAL_NOT_FOUND",
			);
		}

		if (activeAssignment) {
			throw new ClientCommercialAssignmentError(
				"El cliente ya tiene una asignación comercial activa",
				409,
				"ACTIVE_ASSIGNMENT_ALREADY_EXISTS",
			);
		}

		const assignment = assignmentRepo.create({
			client_id: input.clientId,
			commercial_id: input.commercialId,
			assigned_by_user_id: input.assignedByUserId ?? null,
			notes: normalizeText(input.notes) || null,
		});

		await assignmentRepo.save(assignment);

		return assignmentRepo.findOne({
			where: { id: assignment.id },
			relations: {
				client: {
					user: true,
				},
				commercial: {
					user: true,
				},
				assignedByUser: true,
				unassignedByUser: true,
			},
		});
	});
}

export async function unassignClientFromCommercial(
	input: UnassignClientFromCommercialInput,
) {
	const ds = await getDataSource();

	return ds.transaction(async (manager) => {
		const assignmentRepo = manager.getRepository(ClientCommercialAssignment);

		const activeAssignment = await assignmentRepo.findOne({
			where: {
				client_id: input.clientId,
				unassigned_at: IsNull(),
			},
		});

		if (!activeAssignment) {
			throw new ClientCommercialAssignmentError(
				"El cliente no tiene una asignación activa",
				404,
				"ACTIVE_ASSIGNMENT_NOT_FOUND",
			);
		}

		activeAssignment.unassigned_at = new Date();
		activeAssignment.unassigned_by_user_id = input.unassignedByUserId ?? null;

		if (input.notes !== undefined) {
			activeAssignment.notes = normalizeText(input.notes) || null;
		}

		await assignmentRepo.save(activeAssignment);

		return assignmentRepo.findOne({
			where: { id: activeAssignment.id },
			relations: {
				client: {
					user: true,
				},
				commercial: {
					user: true,
				},
				assignedByUser: true,
				unassignedByUser: true,
			},
		});
	});
}

export async function reassignClientToCommercial(
	input: ReassignClientToCommercialInput,
) {
	const ds = await getDataSource();

	return ds.transaction(async (manager) => {
		const clientRepo = manager.getRepository(Client);
		const commercialRepo = manager.getRepository(Commercial);
		const assignmentRepo = manager.getRepository(ClientCommercialAssignment);

		const [client, newCommercial, activeAssignment] = await Promise.all([
			clientRepo.findOne({ where: { id: input.clientId } }),
			commercialRepo.findOne({ where: { id: input.commercialId } }),
			assignmentRepo.findOne({
				where: {
					client_id: input.clientId,
					unassigned_at: IsNull(),
				},
			}),
		]);

		if (!client) {
			throw new ClientCommercialAssignmentError(
				"Cliente no encontrado",
				404,
				"CLIENT_NOT_FOUND",
			);
		}

		if (!newCommercial) {
			throw new ClientCommercialAssignmentError(
				"Comercial no encontrado",
				404,
				"COMMERCIAL_NOT_FOUND",
			);
		}

		if (activeAssignment?.commercial_id === input.commercialId) {
			throw new ClientCommercialAssignmentError(
				"El cliente ya está asignado a este comercial",
				409,
				"CLIENT_ALREADY_ASSIGNED_TO_THIS_COMMERCIAL",
			);
		}

		if (activeAssignment) {
			activeAssignment.unassigned_at = new Date();
			activeAssignment.unassigned_by_user_id = input.assignedByUserId ?? null;
			await assignmentRepo.save(activeAssignment);
		}

		const newAssignment = assignmentRepo.create({
			client_id: input.clientId,
			commercial_id: input.commercialId,
			assigned_by_user_id: input.assignedByUserId ?? null,
			notes: normalizeText(input.notes) || null,
		});

		await assignmentRepo.save(newAssignment);

		return assignmentRepo.findOne({
			where: { id: newAssignment.id },
			relations: {
				client: {
					user: true,
				},
				commercial: {
					user: true,
				},
				assignedByUser: true,
				unassignedByUser: true,
			},
		});
	});
}
