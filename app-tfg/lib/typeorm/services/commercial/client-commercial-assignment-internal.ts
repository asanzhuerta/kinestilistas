import { EntityManager, IsNull } from "typeorm";
import { Client } from "@/lib/typeorm/entities/Client";
import { Commercial } from "@/lib/typeorm/entities/Commercial";
import { ClientCommercialAssignment } from "@/lib/typeorm/entities/ClientCommercialAssignment";
import { normalizeText } from "@/lib/utils/text";

// --------------------------------------------------------------------------
// Servicio interno: asignación comercial-cliente dentro de transacciones
// --------------------------------------------------------------------------

export class AssignClientToCommercialInternalError extends Error {
	status: number;
	code: string;

	constructor(
		message: string,
		status = 400,
		code = "ASSIGN_CLIENT_TO_COMMERCIAL_INTERNAL_ERROR",
	) {
		super(message);
		this.name = "AssignClientToCommercialInternalError";
		this.status = status;
		this.code = code;
	}
}

type AssignClientToCommercialInternalInput = {
	clientId: string;
	commercialId: string;
	assignedByUserId?: string | null;
	notes?: string | null;
};

export async function assignClientToCommercialInternal(
	manager: EntityManager,
	input: AssignClientToCommercialInternalInput,
) {
	const clientRepo = manager.getRepository(Client);
	const commercialRepo = manager.getRepository(Commercial);
	const assignmentRepo = manager.getRepository(ClientCommercialAssignment);

	const client = await clientRepo.findOne({ where: { id: input.clientId } });
	const commercial = await commercialRepo.findOne({
		where: { id: input.commercialId },
	});
	const activeAssignment = await assignmentRepo.findOne({
		where: {
			client_id: input.clientId,
			unassigned_at: IsNull(),
		},
	});

	if (!client) {
		throw new AssignClientToCommercialInternalError(
			"Cliente no encontrado",
			404,
			"CLIENT_NOT_FOUND",
		);
	}

	if (!commercial) {
		throw new AssignClientToCommercialInternalError(
			"Comercial no encontrado",
			404,
			"COMMERCIAL_NOT_FOUND",
		);
	}

	if (activeAssignment) {
		throw new AssignClientToCommercialInternalError(
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
}
