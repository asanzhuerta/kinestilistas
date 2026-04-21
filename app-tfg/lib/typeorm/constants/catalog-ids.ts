// -----------------------------------------------------------------------------
// M1. Gestión de acceso, alta y autorización de usuarios
// -----------------------------------------------------------------------------
// Identificadores de los roles disponibles dentro del sistema.
// Estos valores deben coincidir con los registros sembrados
// en la tabla de roles de la base de datos.
export const ROLE_IDS = {
	ADMIN: 1,
	COMMERCIAL: 2,
	CLIENT: 3,
} as const;

// Identificadores de los estados posibles de una cuenta de usuario.
// Se utilizan para controlar si un usuario puede acceder o no al sistema.
export const USER_STATUS_IDS = {
	ACTIVE: 1,
	INACTIVE: 2,
	BLOCKED: 3,
} as const;

// Identificadores de los estados de una solicitud de registro.
// Permiten distinguir si una solicitud está pendiente,
// aprobada o rechazada.
export const REQUEST_STATUS_IDS = {
	PENDING: 1,
	APPROVED: 2,
	REJECTED: 3,
} as const;

// Identificadores de los posibles orígenes de una solicitud de registro.
// Sirven para distinguir si la solicitud fue iniciada por el propio usuario
// o creada por personal interno.
export const REQUEST_SOURCE_TYPE_IDS = {
	SELF_REGISTRATION: 1,
	ADMIN_CREATED: 2,
	COMMERCIAL_CREATED: 3,
} as const;

// Identificadores de los tipos de acciones administrativas
// que pueden quedar registradas en el historial de gestión de usuarios.
export const USER_ADMIN_ACTION_TYPE_IDS = {
	STATUS_CHANGE: 1,
	ROLE_CHANGE: 2,
	USER_CREATED: 3,
	USER_APPROVED: 4,
	USER_REJECTED: 5,
	PASSWORD_RESET: 6,
	DEACTIVATE_USER: 7,
} as const;

// -----------------------------------------------------------------------------
// M2. Gestión comercial y clientes
// -----------------------------------------------------------------------------

// Identificadores de los estados posibles de una visita comercial.
// Se utilizan para reflejar si la visita está pendiente,
// ya fue realizada o terminó cancelada.
export const COMMERCIAL_VISIT_STATUS_IDS = {
	PLANNED: 1,
	COMPLETED: 2,
	CANCELLED: 3,
} as const;

// Identificadores de los tipos de visita comercial.
// Se utilizan para distinguir visitas rutinarias de visitas de reparto.
export const COMMERCIAL_VISIT_TYPE_IDS = {
	DELIVERY: 1,
	ROUTINE: 2,
} as const;

// Identificadores de los estados posibles de una ruta comercial.
// Permiten representar el ciclo de vida básico de una ruta planificada.
export const COMMERCIAL_ROUTE_STATUS_IDS = {
	PLANNED: 1,
	IN_PROGRESS: 2,
	COMPLETED: 3,
	CANCELLED: 4,
} as const;
