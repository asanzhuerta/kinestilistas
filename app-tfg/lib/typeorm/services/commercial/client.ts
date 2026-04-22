import { getDataSource } from "@/lib/typeorm/data-source";
import { Client } from "@/lib/typeorm/entities/Client";
import { User } from "@/lib/typeorm/entities/User";
import { ROLE_IDS } from "@/lib/typeorm/constants/catalog-ids";

// --------------------------------------------------------------------------
// Funciones auxiliares para normalización de datos
// --------------------------------------------------------------------------

function normalizeText(value: string | null | undefined) {
	return String(value ?? "").trim();
}

// Normaliza texto para comparaciones lógicas.
// Evita considerar cambio real cosas como:
// "CAMINO DEL AGUA 42" vs "camino del agua 42"
function normalizeComparableText(value: string | null | undefined) {
	return String(value ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.trim()
		.replace(/\s+/g, " ")
		.toLowerCase();
}

function normalizeCoordinate(
	value: number | string | null | undefined,
	min: number,
	max: number,
	fieldName: string,
) {
	if (value === undefined) {
		return undefined;
	}

	if (value === null || String(value).trim() === "") {
		return null;
	}

	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
		throw new UpdateClientError(`${fieldName} no es válida`, 400);
	}

	return parsed.toFixed(6);
}

function normalizeTimeValue(value: string | null) {
	const normalized = String(value ?? "").trim();

	if (!normalized) {
		return null;
	}

	const isValid = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(normalized);

	if (!isValid) {
		throw new UpdateClientError(
			"El formato de hora no es válido. Usa HH:mm o HH:mm:ss",
			400,
		);
	}

	return normalized.length === 5 ? `${normalized}:00` : normalized;
}

// --------------------------------------------------------------------------
// Tipos de datos para los inputs de los servicios
// --------------------------------------------------------------------------

type CreateClientInput = {
	name: string;
	contactName?: string | null;
	taxId?: string | null;
	address: string;
	city: string;
	postalCode?: string | null;
	province?: string | null;
	userId: string;
	notes?: string | null;
};

type UpdateClientInput = {
	clientId: string;
	name?: string;
	contactName?: string | null;
	taxId?: string | null;
	address?: string;
	city?: string;
	postalCode?: string | null;
	province?: string | null;
	lat?: number | string | null;
	lng?: number | string | null;
	visitWindowStartTime?: string | null;
	visitWindowEndTime?: string | null;
	notes?: string | null;
};

type UpdateClientLocationInput = {
	clientId: string;
	lat: number | string;
	lng: number | string;
};

type ApplyClientUpdateInput = Omit<UpdateClientInput, "clientId">;

// --------------------------------------------------------------------------
// SERVICIOS
// --------------------------------------------------------------------------

export class CreateClientError extends Error {
	status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.name = "CreateClientError";
		this.status = status;
	}
}

export class UpdateClientError extends Error {
	status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.name = "UpdateClientError";
		this.status = status;
	}
}

function markClientGeolocationAsPending(client: Client) {
	client.lat = null;
	client.lng = null;
	client.geolocation_status = "pending";
	client.geolocation_verified_at = null;
}

function markClientGeolocationAsVerified(
	client: Client,
	lat: string,
	lng: string,
) {
	client.lat = lat;
	client.lng = lng;
	client.geolocation_status = "verified";
	client.geolocation_verified_at = new Date();
}

// --------------------------------------------------------------------------
// Helper compartido de actualización de cliente
// --------------------------------------------------------------------------
// Este helper aplica cambios al registro de cliente y, si cambia la dirección,
// recalcula automáticamente lat/lng. Así evitamos duplicar la misma lógica
// en /api/profile, /api/clients/[id] u otros puntos del sistema.
export async function applyClientUpdate(
	client: Client,
	input: ApplyClientUpdateInput,
) {
	const nextName =
		input.name !== undefined ? normalizeText(input.name) : client.name;

	const nextContactName =
		input.contactName !== undefined
			? normalizeText(input.contactName) || null
			: client.contact_name;

	const nextTaxId =
		input.taxId !== undefined
			? normalizeText(input.taxId) || null
			: client.tax_id;

	const nextAddress =
		input.address !== undefined ? normalizeText(input.address) : client.address;

	const nextCity =
		input.city !== undefined ? normalizeText(input.city) : client.city;

	const nextPostalCode =
		input.postalCode !== undefined
			? normalizeText(input.postalCode) || null
			: client.postal_code;

	const nextProvince =
		input.province !== undefined
			? normalizeText(input.province) || null
			: client.province;

	const nextNotes =
		input.notes !== undefined
			? normalizeText(input.notes) || null
			: client.notes;

	const nextVisitWindowStartTime =
		input.visitWindowStartTime !== undefined
			? normalizeTimeValue(input.visitWindowStartTime)
			: client.visit_window_start_time;

	const nextVisitWindowEndTime =
		input.visitWindowEndTime !== undefined
			? normalizeTimeValue(input.visitWindowEndTime)
			: client.visit_window_end_time;

	if (!nextName) {
		throw new UpdateClientError("El nombre del establecimiento es obligatorio");
	}

	if (!nextAddress) {
		throw new UpdateClientError("La dirección es obligatoria");
	}

	if (!nextCity) {
		throw new UpdateClientError("La ciudad es obligatoria");
	}

	if (
		nextVisitWindowStartTime &&
		nextVisitWindowEndTime &&
		nextVisitWindowStartTime >= nextVisitWindowEndTime
	) {
		throw new UpdateClientError(
			"La hora de inicio de visitas debe ser anterior a la hora de fin",
		);
	}

	// ----------------------------------------------------------------------
	// Detección real de cambio de dirección
	// ----------------------------------------------------------------------
	// No queremos considerar "cambio" una diferencia solo de mayúsculas,
	// tildes o espacios.
	const addressChanged =
		normalizeComparableText(client.address) !==
			normalizeComparableText(nextAddress) ||
		normalizeComparableText(client.city) !==
			normalizeComparableText(nextCity) ||
		normalizeComparableText(client.postal_code) !==
			normalizeComparableText(nextPostalCode) ||
		normalizeComparableText(client.province) !==
			normalizeComparableText(nextProvince);

	client.name = nextName;
	client.contact_name = nextContactName;
	client.tax_id = nextTaxId;
	client.address = nextAddress;
	client.city = nextCity;
	client.postal_code = nextPostalCode;
	client.province = nextProvince;
	client.visit_window_start_time = nextVisitWindowStartTime;
	client.visit_window_end_time = nextVisitWindowEndTime;
	client.notes = nextNotes;
	client.updated_at = new Date();

	// ----------------------------------------------------------------------
	// Si cambia la dirección, se conserva el texto, pero la ubicación pasa
	// a pendiente de confirmar manualmente en mapa.
	// ----------------------------------------------------------------------
	if (addressChanged) {
		markClientGeolocationAsPending(client);
	}

	return client;
}

// Crear cliente profesional
export async function createClient(input: CreateClientInput) {
	const ds = await getDataSource();

	return ds.transaction(async (manager) => {
		const clientRepo = manager.getRepository(Client);
		const userRepo = manager.getRepository(User);

		const linkedUser = await userRepo.findOne({
			where: { id: input.userId },
		});

		if (!linkedUser || linkedUser.role_id !== ROLE_IDS.CLIENT) {
			throw new CreateClientError("Usuario cliente inválido");
		}

		const existing = await clientRepo.findOne({
			where: { id: input.userId },
		});

		if (existing) {
			throw new CreateClientError("Ya existe cliente para este usuario");
		}

		// ----------------------------------------------------------------------
		// Nueva regla:
		// al crear cliente guardamos la dirección escrita, pero la ubicación
		// queda pendiente de confirmar manualmente en el mapa.
		// ----------------------------------------------------------------------
		let lat: string | null = null;
		let lng: string | null = null;

		const client = clientRepo.create({
			id: input.userId,
			name: normalizeText(input.name),
			contact_name: normalizeText(input.contactName) || null,
			tax_id: normalizeText(input.taxId) || null,
			address: normalizeText(input.address),
			city: normalizeText(input.city),
			postal_code: normalizeText(input.postalCode) || null,
			province: normalizeText(input.province) || null,
			lat,
			lng,
			geolocation_status: "pending",
			geolocation_verified_at: null,
			notes: normalizeText(input.notes) || null,
		});

		return clientRepo.save(client);
	});
}

// Obtener cliente por ID
export async function getClientById(id: string) {
	const ds = await getDataSource();
	const repo = ds.getRepository(Client);

	return repo
		.createQueryBuilder("client")
		.leftJoinAndSelect("client.user", "user")
		.leftJoinAndSelect(
			"client.commercialAssignments",
			"activeAssignment",
			"activeAssignment.unassigned_at IS NULL",
		)
		.leftJoinAndSelect("activeAssignment.commercial", "commercial")
		.leftJoinAndSelect("commercial.user", "commercialUser")
		.where("client.id = :id", { id })
		.orderBy("activeAssignment.assigned_at", "DESC")
		.getOne();
}

// Obtener cliente por ID sin relaciones (para uso interno en otros servicios)
export async function listClients() {
	const ds = await getDataSource();
	const repo = ds.getRepository(Client);

	return repo
		.createQueryBuilder("client")
		.leftJoinAndSelect("client.user", "user")
		.leftJoinAndSelect(
			"client.commercialAssignments",
			"activeAssignment",
			"activeAssignment.unassigned_at IS NULL",
		)
		.leftJoinAndSelect("activeAssignment.commercial", "commercial")
		.leftJoinAndSelect("commercial.user", "commercialUser")
		.orderBy("client.created_at", "DESC")
		.getMany();
}

// Actualizar datos de cliente
export async function updateClient(input: UpdateClientInput) {
	const ds = await getDataSource();

	return ds.transaction(async (manager) => {
		const repo = manager.getRepository(Client);

		const client = await repo.findOne({
			where: { id: input.clientId },
		});

		if (!client) {
			throw new UpdateClientError("Cliente no encontrado", 404);
		}

		await applyClientUpdate(client, {
			name: input.name,
			contactName: input.contactName,
			taxId: input.taxId,
			address: input.address,
			city: input.city,
			postalCode: input.postalCode,
			province: input.province,
			lat: input.lat,
			lng: input.lng,
			visitWindowStartTime: input.visitWindowStartTime,
			visitWindowEndTime: input.visitWindowEndTime,
			notes: input.notes,
		});

		await repo.save(client);

		return client;
	});
}

export async function updateClientLocation(input: UpdateClientLocationInput) {
	const ds = await getDataSource();

	return ds.transaction(async (manager) => {
		const repo = manager.getRepository(Client);

		const client = await repo.findOne({
			where: { id: input.clientId },
		});

		if (!client) {
			throw new UpdateClientError("Cliente no encontrado", 404);
		}

		const lat = normalizeCoordinate(input.lat, -90, 90, "La latitud");
		const lng = normalizeCoordinate(input.lng, -180, 180, "La longitud");

		if (!lat || !lng) {
			throw new UpdateClientError(
				"La latitud y la longitud son obligatorias",
				400,
			);
		}

		markClientGeolocationAsVerified(client, lat, lng);
		client.updated_at = new Date();

		await repo.save(client);

		return client;
	});
}

// Obtener cliente por usuario vinculado
export async function getClientByUserId(userId: string) {
	const ds = await getDataSource();
	const repo = ds.getRepository(Client);

	return repo
		.createQueryBuilder("client")
		.leftJoinAndSelect("client.user", "user")
		.leftJoinAndSelect(
			"client.commercialAssignments",
			"activeAssignment",
			"activeAssignment.unassigned_at IS NULL",
		)
		.leftJoinAndSelect("activeAssignment.commercial", "commercial")
		.leftJoinAndSelect("commercial.user", "commercialUser")
		.where("client.id = :userId", { userId })
		.getOne();
}

// Listar clientes asignados a un comercial
export async function listClientsByCommercialId(commercialId: string) {
	const ds = await getDataSource();
	const repo = ds.getRepository(Client);

	return repo
		.createQueryBuilder("client")
		.leftJoinAndSelect("client.user", "user")
		.innerJoinAndSelect(
			"client.commercialAssignments",
			"activeAssignment",
			"activeAssignment.unassigned_at IS NULL AND activeAssignment.commercial_id = :commercialId",
			{ commercialId },
		)
		.leftJoinAndSelect("activeAssignment.commercial", "commercial")
		.leftJoinAndSelect("commercial.user", "commercialUser")
		.orderBy("client.created_at", "DESC")
		.getMany();
}

// Obtener cliente por ID para comercial
// (solo si tiene asignación activa con ese comercial)
export async function getClientByIdForCommercial(
	clientId: string,
	commercialId: string,
) {
	const ds = await getDataSource();
	const repo = ds.getRepository(Client);

	return repo
		.createQueryBuilder("client")
		.leftJoinAndSelect("client.user", "user")
		.innerJoinAndSelect(
			"client.commercialAssignments",
			"activeAssignment",
			"activeAssignment.unassigned_at IS NULL AND activeAssignment.commercial_id = :commercialId",
			{ commercialId },
		)
		.leftJoinAndSelect("activeAssignment.commercial", "commercial")
		.leftJoinAndSelect("commercial.user", "commercialUser")
		.where("client.id = :clientId", { clientId })
		.getOne();
}
