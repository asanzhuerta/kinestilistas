export type AdminUserType = "comercial" | "cliente";

export type RegisterAdminUserBody = {
	name?: string;
	email?: string;
	password?: string;
	company?: string | null;
	phone?: string | null;
	type?: AdminUserType;
	commercialId?: string | null;
};

export type RegisterAdminUserResponse = {
	message: string;
	userId: string;
};
