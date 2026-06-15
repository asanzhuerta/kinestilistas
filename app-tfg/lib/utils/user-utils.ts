// Utilidades de presentación para la tabla de usuarios.
// Aquí mantenemos solo lo que pertenece claramente a la UI:
// - tipo plano que consume la tabla
// - labels y clases visuales
// - helpers de búsqueda, ordenación y fechas

export type UserRoleCode = "admin" | "client" | "commercial";
export type UserStatusCode = "active" | "inactive" | "blocked";

// DTO de UI.
// No es la entidad TypeORM: es el shape plano que usa la tabla en cliente.
export type Usuario = {
	id: string;
	name: string;
	email: string;
	company: string | null;
	phone: string | null;
	role: UserRoleCode;
	status: UserStatusCode;
	profile_image_url: string | null;
	created_at: string;
	last_login_at: string | null;
};

export type SortField = keyof Usuario;
export type SortDirection = "asc" | "desc";

export const sortableFields: { key: SortField; label: string }[] = [
	{ key: "id", label: "ID" },
	{ key: "name", label: "Nombre" },
	{ key: "email", label: "Correo" },
	{ key: "company", label: "Empresa" },
	{ key: "phone", label: "Teléfono" },
	{ key: "role", label: "Rol" },
	{ key: "status", label: "Estado" },
	{ key: "profile_image_url", label: "Imagen" },
	{ key: "created_at", label: "Fecha de alta" },
	{ key: "last_login_at", label: "Último acceso" },
];

type DateLike = Date | string | null | undefined;

function parseDate(value: DateLike) {
	if (!value) return null;

	const date = value instanceof Date ? value : new Date(value);

	if (Number.isNaN(date.getTime())) {
		return null;
	}

	return date;
}

// Formatea una fecha y hora en formato numérico.
// Ejemplo: 26/04/2026, 11:30
export function formatDate(value: DateLike) {
	const date = parseDate(value);

	if (!date) return "-";

	return date.toLocaleString("es-ES", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

// Formatea solo la fecha en formato corto.
// Ejemplo: 26/04/26
export function formatDateShort(value: DateLike) {
	const date = parseDate(value);

	if (!date) return "-";

	return date.toLocaleDateString("es-ES", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
	});
}

// Formatea una fecha y hora en formato más legible.
// Si no es una fecha válida, devuelve el valor original.
// Ejemplo: 26 abr 2026, 11:30
export function formatDateTime(value: DateLike) {
	const date = parseDate(value);

	if (!date) {
		return typeof value === "string" && value ? value : "--";
	}

	return date.toLocaleString("es-ES", {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

// Normaliza valores para búsqueda y filtrado.
export function normalizeValue(value: unknown): string {
	if (value === null || value === undefined) return "";
	return String(value).toLowerCase();
}

// Compara valores. Si ambos son fechas válidas, compara como fecha.
export function compareValues(a: unknown, b: unknown) {
	if (a === null || a === undefined) return 1;
	if (b === null || b === undefined) return -1;

	const aDate =
		typeof a === "string" && !Number.isNaN(Date.parse(a))
			? Date.parse(a)
			: null;
	const bDate =
		typeof b === "string" && !Number.isNaN(Date.parse(b))
			? Date.parse(b)
			: null;

	if (aDate !== null && bDate !== null) {
		return aDate - bDate;
	}

	return String(a).localeCompare(String(b), "es", { sensitivity: "base" });
}

// Labels legibles para rol y estado.
export function getRoleLabel(role: UserRoleCode) {
	switch (role) {
		case "admin":
			return "Administrador";
		case "client":
			return "Cliente";
		case "commercial":
			return "Comercial";
	}
}

export function getStatusLabel(status: UserStatusCode) {
	switch (status) {
		case "active":
			return "Activo";
		case "inactive":
			return "Inactivo";
		case "blocked":
			return "Bloqueado";
	}
}

// Clases visuales dark.
export function getRoleClasses(role: UserRoleCode) {
	switch (role) {
		case "admin":
			return "bg-red-500/20 text-red-200";
		case "client":
			return "bg-emerald-500/20 text-emerald-200";
		case "commercial":
			return "bg-blue-500/20 text-blue-200";
	}
}

export function getStatusClasses(status: UserStatusCode) {
	switch (status) {
		case "active":
			return "bg-green-500/20 text-green-200";
		case "inactive":
			return "bg-yellow-500/20 text-yellow-200";
		case "blocked":
			return "bg-red-500/20 text-red-200";
	}
}

// Clases visuales light.
export function getRoleClassesLight(role: UserRoleCode) {
	switch (role) {
		case "admin":
			return "bg-red-100 text-red-700";
		case "client":
			return "bg-emerald-100 text-emerald-700";
		case "commercial":
			return "bg-blue-100 text-blue-700";
	}
}

export function getStatusClassesLight(status: UserStatusCode) {
	switch (status) {
		case "active":
			return "bg-green-100 text-green-700";
		case "inactive":
			return "bg-yellow-100 text-yellow-700";
		case "blocked":
			return "bg-red-100 text-red-700";
	}
}
