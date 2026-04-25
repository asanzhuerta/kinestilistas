export type CommercialLinkedUser = {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	company: string | null;
	profile_image_url: string | null;
};

export type CommercialUserSummary = {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	profile_image_url: string | null;
};

export type CommercialSummary = {
	id: string;
	employee_code: string | null;
	territory: string | null;
	notes: string | null;
	user: CommercialUserSummary | null;
};

export type CommercialClientAssignment = {
	id: string;
	assigned_at: string;
	unassigned_at: string | null;
	notes: string | null;
	commercial: CommercialSummary | null;
};

export type CommercialClient = {
	id: string;
	name: string;
	contact_name: string | null;
	tax_id: string | null;
	address: string;
	city: string;
	postal_code: string | null;
	province: string | null;
	notes: string | null;
	created_at: string;
	updated_at: string;
	user: CommercialLinkedUser | null;
	commercialAssignments?: CommercialClientAssignment[];
};

export function getActiveAssignment(client: CommercialClient) {
	return client.commercialAssignments?.[0] ?? null;
}

export function getCommercialDisplayName(client: CommercialClient) {
	const activeAssignment = getActiveAssignment(client);
	return activeAssignment?.commercial?.user?.name ?? "-";
}

export function getClientLocation(client: CommercialClient) {
	return [client.city, client.province].filter(Boolean).join(" · ") || "-";
}
