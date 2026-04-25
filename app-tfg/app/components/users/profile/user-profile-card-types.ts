import {
	ClientFormDataState,
	ClientProfileData,
} from "@/lib/contracts/client-profile";

// ----------------------------------------------------------------------------
// TIPOS DEL USER PROFILE CARD
// ----------------------------------------------------------------------------
// Se separan del componente para mantener el archivo principal más limpio
// y para poder reutilizar estos tipos en otras piezas del sistema.

// Tipo de datos para el usuario que se muestra en la tarjeta de perfil.
export type UserProfileCardUser = {
	id: string;
	name: string;
	email: string;
	company?: string | null;
	phone?: string | null;
	profile_image_url?: string | null;
	created_at: string | Date;
	last_login_at?: string | Date | null;
	role_id?: number;
	status_id?: number;
	role: {
		code: "admin" | "client" | "commercial";
	};
	status: {
		code: "active" | "inactive" | "blocked";
	};
};

// Tipo de opción para los selectores de rol y estado en edición administrativa.
export type CatalogOption = {
	id: number;
	name: string;
};

export type UserProfileCardMode = "view" | "edit" | "admin-edit";

// Estado local completo del formulario.
// Reúne tanto los datos del usuario como los del perfil cliente.
export type FormDataState = {
	name: string;
	email: string;
	company: string;
	phone: string;
	profile_image_url: string;
	roleId: number;
	statusId: number;
	password: string;
	confirmPassword: string;
} & ClientFormDataState;

// Props del componente principal de perfil.
export type UserProfileCardProps = {
	user: UserProfileCardUser;
	clientProfile?: ClientProfileData | null;
	mode?: UserProfileCardMode;
	title?: string;
	subtitle?: string;
	roles?: CatalogOption[];
	statuses?: CatalogOption[];
	backHref?: string;
	submitLabel?: string;
	submitUrl?: string;
	allowPasswordChange?: boolean;
};
