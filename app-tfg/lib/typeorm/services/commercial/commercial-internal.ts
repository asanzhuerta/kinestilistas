import { EntityManager } from "typeorm";
import { Commercial } from "@/lib/typeorm/entities/Commercial";
import { normalizeText } from "@/lib/utils/text";

// --------------------------------------------------------------------------
// Servicio interno: creación automática de perfil comercial desde usuario
// --------------------------------------------------------------------------

type CreateCommercialFromUserInput = {
	userId: string;
	territory?: string | null;
	notes?: string | null;
};

// Este servicio NO valida roles ni permisos.
// Se usa internamente dentro de otros servicios (ej: registerUserByAdmin).
export async function createCommercialFromUser(
	manager: EntityManager,
	input: CreateCommercialFromUserInput,
) {
	const repo = manager.getRepository(Commercial);

	const existing = await repo.findOne({
		where: { id: input.userId },
	});

	if (existing) {
		return existing;
	}

	await repo.insert({
		id: input.userId,
		employee_code: null,
		territory: normalizeText(input.territory) || null,
		notes:
			normalizeText(input.notes) || "Perfil comercial creado automáticamente",
	});

	return repo.findOne({
		where: { id: input.userId },
		relations: {
			user: true,
		},
	});
}
