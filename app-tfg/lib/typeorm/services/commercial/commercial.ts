import { getDataSource } from "@/lib/typeorm/data-source";
import { ROLE_IDS } from "@/lib/typeorm/constants/catalog-ids";
import { Commercial } from "@/lib/typeorm/entities/Commercial";
import { User } from "@/lib/typeorm/entities/User";

function normalizeText(value: string | null | undefined) {
	return String(value ?? "").trim();
}

function normalizeTimeValue(value: string | null | undefined) {
	const normalized = String(value ?? "").trim();

	if (!normalized) {
		return null;
	}

	const isValid = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(normalized);

	if (!isValid) {
		throw new CommercialProfileError(
			"El formato de hora no es válido. Usa HH:mm o HH:mm:ss",
			400,
			"INVALID_TIME_FORMAT",
		);
	}

	return normalized.length === 5 ? `${normalized}:00` : normalized;
}

function normalizePositiveInteger(
	value: number | string | null | undefined,
	fieldName: string,
	code: string,
) {
	if (value === undefined) {
		return undefined;
	}

	if (value === null || String(value).trim() === "") {
		return null;
	}

	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new CommercialProfileError(
			`${fieldName} debe ser un entero positivo`,
			400,
			code,
		);
	}

	return parsed;
}

function normalizeCoordinate(
	value: number | string | null,
	min: number,
	max: number,
	fieldName: string,
	code: string,
): string | null {
	if (value === null || String(value).trim() === "") {
		return null;
	}

	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
		throw new CommercialProfileError(`${fieldName} no es válida`, 400, code);
	}

	return parsed.toFixed(6);
}

type UpsertCommercialProfileInput = {
	userId: string;
	employeeCode?: string | null;
	territory?: string | null;
	notes?: string | null;
	workdayStartTime?: string | null;
	workdayEndTime?: string | null;
	deliveryVisitDurationMinutes?: number | string | null;
	routineVisitDurationMinutes?: number | string | null;
	routeStartAddress?: string | null;
	routeEndAddress?: string | null;
	returnToStart?: boolean;
	routeStartLat?: number | string | null;
	routeStartLng?: number | string | null;
	routeEndLat?: number | string | null;
	routeEndLng?: number | string | null;
};

export class CommercialProfileError extends Error {
	status: number;
	code: string;

	constructor(
		message: string,
		status = 400,
		code = "COMMERCIAL_PROFILE_ERROR",
	) {
		super(message);
		this.name = "CommercialProfileError";
		this.status = status;
		this.code = code;
	}
}

export async function getCommercialById(id: string) {
	const ds = await getDataSource();
	const repo = ds.getRepository(Commercial);

	return repo.findOne({
		where: { id },
		relations: {
			user: true,
		},
	});
}

export async function getCommercialByUserId(userId: string) {
	return getCommercialById(userId);
}

export async function requireCommercialByUserId(userId: string) {
	const commercial = await getCommercialByUserId(userId);

	if (!commercial) {
		throw new CommercialProfileError(
			"No existe perfil comercial para este usuario",
			404,
			"COMMERCIAL_PROFILE_NOT_FOUND",
		);
	}

	return commercial;
}

export async function listCommercials() {
	const ds = await getDataSource();
	const repo = ds.getRepository(Commercial);

	return repo.find({
		relations: {
			user: true,
		},
		order: {
			created_at: "DESC",
		},
	});
}

export async function upsertCommercialProfile(
	input: UpsertCommercialProfileInput,
) {
	const ds = await getDataSource();

	return ds.transaction(async (manager) => {
		const userRepo = manager.getRepository(User);
		const commercialRepo = manager.getRepository(Commercial);

		const user = await userRepo.findOne({
			where: { id: input.userId },
		});

		if (!user) {
			throw new CommercialProfileError(
				"Usuario no encontrado",
				404,
				"USER_NOT_FOUND",
			);
		}

		if (user.role_id !== ROLE_IDS.COMMERCIAL) {
			throw new CommercialProfileError(
				"El usuario indicado no tiene rol comercial",
				400,
				"INVALID_COMMERCIAL_ROLE",
			);
		}

		let commercial = await commercialRepo.findOne({
			where: { id: input.userId },
			relations: {
				user: true,
			},
		});

		if (!commercial) {
			commercial = commercialRepo.create({
				id: input.userId,
				employee_code: null,
				territory: null,
				notes: null,
				workday_start_time: null,
				workday_end_time: null,
				delivery_visit_duration_minutes: 10,
				routine_visit_duration_minutes: 35,
				route_start_address: null,
				route_end_address: null,
				return_to_start: true,
				route_start_lat: null,
				route_start_lng: null,
				route_end_lat: null,
				route_end_lng: null,
			});
		}

		if (input.employeeCode !== undefined) {
			commercial.employee_code = normalizeText(input.employeeCode) || null;
		}

		if (input.territory !== undefined) {
			commercial.territory = normalizeText(input.territory) || null;
		}

		if (input.notes !== undefined) {
			commercial.notes = normalizeText(input.notes) || null;
		}

		if (input.workdayStartTime !== undefined) {
			commercial.workday_start_time = normalizeTimeValue(
				input.workdayStartTime,
			);
		}

		if (input.workdayEndTime !== undefined) {
			commercial.workday_end_time = normalizeTimeValue(input.workdayEndTime);
		}

		if (input.deliveryVisitDurationMinutes !== undefined) {
			const normalizedDeliveryDuration = normalizePositiveInteger(
				input.deliveryVisitDurationMinutes,
				"La duración de la visita de reparto",
				"INVALID_DELIVERY_VISIT_DURATION",
			);

			if (typeof normalizedDeliveryDuration !== "number") {
				throw new CommercialProfileError(
					"La duración de la visita de reparto no es válida",
					400,
					"DELIVERY_VISIT_DURATION_REQUIRED",
				);
			}

			commercial.delivery_visit_duration_minutes = normalizedDeliveryDuration;
		}

		if (input.routineVisitDurationMinutes !== undefined) {
			const normalizedRoutineDuration = normalizePositiveInteger(
				input.routineVisitDurationMinutes,
				"La duración de la visita rutinaria",
				"INVALID_ROUTINE_VISIT_DURATION",
			);

			if (typeof normalizedRoutineDuration !== "number") {
				throw new CommercialProfileError(
					"La duración de la visita rutinaria no es válida",
					400,
					"ROUTINE_VISIT_DURATION_REQUIRED",
				);
			}

			commercial.routine_visit_duration_minutes = normalizedRoutineDuration;
		}

		if (input.routeStartAddress !== undefined) {
			commercial.route_start_address =
				normalizeText(input.routeStartAddress) || null;
		}

		if (input.routeEndAddress !== undefined) {
			commercial.route_end_address =
				normalizeText(input.routeEndAddress) || null;
		}

		if (input.returnToStart !== undefined) {
			commercial.return_to_start = Boolean(input.returnToStart);
		}

		if (input.routeStartLat !== undefined) {
			commercial.route_start_lat = normalizeCoordinate(
				input.routeStartLat,
				-90,
				90,
				"La latitud inicial",
				"INVALID_ROUTE_START_LAT",
			);
		}

		if (input.routeStartLng !== undefined) {
			commercial.route_start_lng = normalizeCoordinate(
				input.routeStartLng,
				-180,
				180,
				"La longitud inicial",
				"INVALID_ROUTE_START_LNG",
			);
		}

		if (input.routeEndLat !== undefined) {
			commercial.route_end_lat = normalizeCoordinate(
				input.routeEndLat,
				-90,
				90,
				"La latitud final",
				"INVALID_ROUTE_END_LAT",
			);
		}

		if (input.routeEndLng !== undefined) {
			commercial.route_end_lng = normalizeCoordinate(
				input.routeEndLng,
				-180,
				180,
				"La longitud final",
				"INVALID_ROUTE_END_LNG",
			);
		}

		await commercialRepo.save(commercial);

		return commercialRepo.findOne({
			where: { id: input.userId },
			relations: {
				user: true,
			},
		});
	});
}
