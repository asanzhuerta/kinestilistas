import {
	buildInitialClientFormData,
	ClientProfileData,
} from "@/lib/contracts/client-profile";
import {
	FormDataState,
	UserProfileCardUser,
} from "@/app/components/users/profile/user-profile-card-types";

// ----------------------------------------------------------------------------
// HELPERS DE USER PROFILE CARD
// ----------------------------------------------------------------------------

// Convierte fechas a string ISO si vienen como Date.
// Devuelve null si no hay valor.
export function toDateString(value: string | Date | null | undefined) {
	if (!value) return null;
	return value instanceof Date ? value.toISOString() : value;
}

// Construye el estado inicial del formulario combinando:
// - datos básicos del usuario
// - datos del perfil cliente, si existen
export function buildInitialFormData(
	user: UserProfileCardUser,
	clientProfile?: ClientProfileData | null,
): FormDataState {
	const clientData = buildInitialClientFormData(clientProfile);

	return {
		name: user.name ?? "",
		email: user.email ?? "",
		company: user.company ?? "",
		phone: user.phone ?? "",
		profile_image_url: user.profile_image_url ?? "",
		roleId: Number(user.role_id ?? 0),
		statusId: Number(user.status_id ?? 0),
		password: "",
		confirmPassword: "",
		client_name: clientData.client_name,
		contact_name: clientData.contact_name,
		tax_id: clientData.tax_id,
		address: clientData.address,
		city: clientData.city,
		postal_code: clientData.postal_code,
		province: clientData.province,
		lat: clientData.lat,
		lng: clientData.lng,
		visit_window_start_time: clientData.visit_window_start_time,
		visit_window_end_time: clientData.visit_window_end_time,
		notes: clientData.notes,
	};
}
