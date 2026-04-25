export type ClientProfileData = {
	id?: string;
	name?: string;
	contact_name?: string | null;
	tax_id?: string | null;
	address?: string | null;
	city?: string | null;
	postal_code?: string | null;
	province?: string | null;
	lat?: string | number | null;
	lng?: string | number | null;
	visit_window_start_time?: string | null;
	visit_window_end_time?: string | null;
	notes?: string | null;
};

export type ClientProfilePayload = {
	name?: string;
	contact_name?: string | null;
	tax_id?: string | null;
	address?: string | null;
	city?: string | null;
	postal_code?: string | null;
	province?: string | null;
	lat?: number | string | null;
	lng?: number | string | null;
	visit_window_start_time?: string | null;
	visit_window_end_time?: string | null;
	notes?: string | null;
};

export type ClientFormDataState = {
	client_name: string;
	contact_name: string;
	tax_id: string;
	address: string;
	city: string;
	postal_code: string;
	province: string;
	lat: string;
	lng: string;
	visit_window_start_time: string;
	visit_window_end_time: string;
	notes: string;
};

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
		lat:
			client?.lat === null || client?.lat === undefined ? "" : String(client.lat),
		lng:
			client?.lng === null || client?.lng === undefined ? "" : String(client.lng),
		visit_window_start_time: client?.visit_window_start_time?.slice(0, 5) ?? "",
		visit_window_end_time: client?.visit_window_end_time?.slice(0, 5) ?? "",
		notes: client?.notes ?? "",
	};
}
