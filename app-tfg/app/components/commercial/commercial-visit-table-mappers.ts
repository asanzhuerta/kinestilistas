import type { EntityTableItem } from "@/app/components/entity-table/entity-table-types";
import type { CommercialVisit } from "./commercial-visit-types";
import {
	formatVisitDate,
	getVisitStatusLabel,
	getVisitTypeLabel,
} from "./commercial-visit-types";

export type VisitRouteMetadata = {
	sequence?: number | null;
	estimatedArrivalTime?: string | null;
	isPastVisitWindow?: boolean;
};

export function mapCommercialVisitsToEntityTableItems(
	visits: CommercialVisit[],
	routeMetadataByClientId?: Map<string, VisitRouteMetadata>,
): EntityTableItem[] {
	return visits.map((visit) => {
		const location =
			[visit.client?.city, visit.client?.province].filter(Boolean).join(" · ") ||
			"-";
		const routeMetadata = visit.client_id
			? routeMetadataByClientId?.get(visit.client_id)
			: undefined;
		const routeLabel =
			routeMetadata?.sequence && routeMetadata.estimatedArrivalTime
				? `#${routeMetadata.sequence} · ${routeMetadata.estimatedArrivalTime}`
				: routeMetadata?.sequence
					? `#${routeMetadata.sequence}`
					: routeMetadata?.estimatedArrivalTime || null;
		const badges = [
			{
				label: formatVisitDate(visit.scheduled_for_date),
				className: "bg-slate-100 text-slate-700",
			},
			{
				label: getVisitTypeLabel(visit.visit_type_id),
				className: "bg-blue-50 text-blue-700",
			},
		];

		if (routeLabel) {
			badges.push({
				label: routeLabel,
				className: "bg-sky-50 text-sky-700",
			});
		}

		if (routeMetadata?.isPastVisitWindow) {
			badges.push({
				label: "Fuera de franja",
				className: "bg-rose-50 text-rose-700",
			});
		}

		return {
			id: visit.id,
			title: visit.client?.name ?? "Cliente",
			subtitle:
				visit.client?.contact_name ||
				visit.client?.user?.email ||
				"Sin persona de contacto",
			imageUrl: visit.client?.user?.profile_image_url ?? null,
			category: visit.client?.province || "Sin provincia",
			status: getVisitStatusLabel(visit.status_id),
			primaryDate: visit.scheduled_for_date,
			secondaryDate: null,
			badges,
			fields: [
				{
					label: "Correo",
					value: visit.client?.user?.email || "-",
				},
				{
					label: "Ubicacion",
					value: location,
				},
				{
					label: "Tipo",
					value: getVisitTypeLabel(visit.visit_type_id),
				},
				{
					label: "Estado",
					value: getVisitStatusLabel(visit.status_id),
				},
				{
					label: "Ruta",
					value: routeLabel || "-",
				},
				{
					label: "Notas",
					value: visit.notes || "-",
				},
			],
			actions: [
				{
					label: "Ver detalle",
					href: `/commercials/visits/${visit.id}`,
					variant: "primary",
				},
			],
			searchText: [
				visit.client?.name,
				visit.client?.contact_name,
				visit.client?.user?.email,
				visit.client?.city,
				visit.client?.province,
				visit.notes,
				visit.result,
				getVisitStatusLabel(visit.status_id),
				getVisitTypeLabel(visit.visit_type_id),
				routeLabel,
			]
				.filter(Boolean)
				.join(" "),
		};
	});
}
