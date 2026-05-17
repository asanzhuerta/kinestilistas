import type {
	CommercialVisitDetail,
	CommercialVisitDeliveryOrder,
	CommercialVisit,
	CommercialVisitClient,
	CommercialVisitClientUser,
	CommercialVisitCommercial,
	CommercialVisitCommercialUser,
	CommercialVisitStatus,
	CommercialVisitStatusCode,
	CommercialVisitType,
	CommercialVisitTypeCode,
} from "@/lib/contracts/commercial-visit";

export type {
	CommercialVisitDetail,
	CommercialVisitDeliveryOrder,
	CommercialVisit,
	CommercialVisitClient,
	CommercialVisitClientUser,
	CommercialVisitCommercial,
	CommercialVisitCommercialUser,
	CommercialVisitStatus,
	CommercialVisitStatusCode,
	CommercialVisitType,
	CommercialVisitTypeCode,
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
