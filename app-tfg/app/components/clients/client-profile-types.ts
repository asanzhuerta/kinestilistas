// ----------------------------------------------------------------------------
// TIPOS DE PERFIL DE CLIENTE
// ----------------------------------------------------------------------------
// Este archivo centraliza los tipos relacionados con la información adicional
// del perfil de cliente profesional (peluquería). Se separa del componente
// principal para evitar que UserProfileCard siga creciendo demasiado y para
// poder reutilizar estos tipos en otras partes de la app.

// Datos del perfil cliente tal y como llegan desde servidor.
// Se usa para inicializar el formulario y para pasar la información
// desde las páginas server hacia los componentes client.
export type ClientProfileData = {
	id?: string;
	name?: string;
	contact_name?: string | null;
	tax_id?: string | null;
	address?: string | null;
	city?: string | null;
	postal_code?: string | null;
	province?: string | null;
	visit_window_start_time?: string | null;
	visit_window_end_time?: string | null;
	notes?: string | null;
};

// Estado local del bloque de formulario de cliente.
// Aquí todo se modela como string porque son campos de formulario.
export type ClientFormDataState = {
	client_name: string;
	contact_name: string;
	tax_id: string;
	address: string;
	city: string;
	postal_code: string;
	province: string;
	visit_window_start_time: string;
	visit_window_end_time: string;
	notes: string;
};

function normalizeTimeForForm(value?: string | null) {
	if (!value) {
		return "";
	}

	return value.slice(0, 5);
}

// Construye el estado inicial del bloque cliente a partir de los datos
// persistidos. Si no existen datos todavía, devuelve strings vacíos.
export function buildInitialClientFormData(
	client?: ClientProfileData | null,
): ClientFormDataState {
	return {
		client_name: client?.name ?? "",
		contact_name: client?.contact_name ?? "",
		tax_id: client?.tax_id ?? "",
		address: client?.address ?? "",
		city: client?.city ?? "",
		postal_code: client?.postal_code ?? "",
		province: client?.province ?? "",
		visit_window_start_time: normalizeTimeForForm(
			client?.visit_window_start_time,
		),
		visit_window_end_time: normalizeTimeForForm(client?.visit_window_end_time),
		notes: client?.notes ?? "",
	};
}
