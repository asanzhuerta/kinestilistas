export type CommercialVisitStatusCode =
	| "planned"
	| "completed"
	| "cancelled"
	| "postponed";
export type CommercialVisitTypeCode = "delivery" | "routine";

export type CommercialVisitClientUser = {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	profile_image_url: string | null;
};

export type CommercialVisitClient = {
	id: string;
	name: string;
	contact_name: string | null;
	city: string;
	province: string | null;
	visit_window_start_time: string | null;
	visit_window_end_time: string | null;
	user: CommercialVisitClientUser | null;
};

export type CommercialVisitCommercialUser = {
	id: string;
	name: string;
	email: string;
	phone: string | null;
};

export type CommercialVisitCommercial = {
	id: string;
	employee_code: string | null;
	territory: string | null;
	user: CommercialVisitCommercialUser | null;
};

export type CommercialVisitStatus = {
	id: number;
	code?: CommercialVisitStatusCode;
	name?: string;
};

export type CommercialVisitType = {
	id: number;
	code?: CommercialVisitTypeCode;
	name?: string;
};

export type CommercialVisit = {
	id: string;
	client_id: string;
	commercial_id: string;
	scheduled_for_date: string;
	visit_type_id: number;
	status_id: number;
	notes: string | null;
	result: string | null;
	client: CommercialVisitClient | null;
	commercial: CommercialVisitCommercial | null;
	visitType: CommercialVisitType | null;
	status: CommercialVisitStatus | null;
};

export const COMMERCIAL_VISIT_STATUS_OPTIONS = [
	{ id: 1, label: "Planificada" },
	{ id: 2, label: "Completada" },
	{ id: 3, label: "Cancelada" },
	{ id: 4, label: "Aplazada" },
] as const;

export const COMMERCIAL_VISIT_TYPE_OPTIONS = [
	{ id: 1, label: "Reparto" },
	{ id: 2, label: "Rutinaria" },
] as const;

export function getVisitStatusLabel(statusId: number) {
	switch (statusId) {
		case 1:
			return "Planificada";
		case 2:
			return "Completada";
		case 3:
			return "Cancelada";
		case 4:
			return "Aplazada";
		default:
			return "Desconocido";
	}
}

export function getVisitTypeLabel(visitTypeId: number) {
	switch (visitTypeId) {
		case 1:
			return "Reparto";
		case 2:
			return "Rutinaria";
		default:
			return "Desconocido";
	}
}

export function getVisitStatusClasses(statusId: number) {
	switch (statusId) {
		case 1:
			return "bg-amber-50 text-amber-700";
		case 2:
			return "bg-emerald-50 text-emerald-700";
		case 3:
			return "bg-rose-50 text-rose-700";
		case 4:
			return "bg-orange-50 text-orange-700";
		default:
			return "bg-slate-100 text-slate-700";
	}
}

export function formatVisitDate(value: string | null | undefined) {
	if (!value) {
		return "-";
	}

	const date = new Date(`${value}T00:00:00`);

	if (Number.isNaN(date.getTime())) {
		return "-";
	}

	return new Intl.DateTimeFormat("es-ES", {
		dateStyle: "medium",
	}).format(date);
}
