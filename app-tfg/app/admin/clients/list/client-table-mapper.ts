import { formatDate } from "@/lib/utils/user-utils";
import type { EntityTableItem } from "@/app/components/entity-table/entity-table-types";

type AdminClientTableUser = {
	name?: string | null;
	email?: string | null;
	phone?: string | null;
	profile_image_url?: string | null;
};

type AdminClientTableCommercial = {
	user?: AdminClientTableUser | null;
};

type AdminClientTableAssignment = {
	assigned_at?: Date | string | null;
	commercial?: AdminClientTableCommercial | null;
};

type AdminClientTableSource = {
	id: string;
	name: string;
	contact_name?: string | null;
	city?: string | null;
	province?: string | null;
	created_at?: Date | string | null;
	user?: AdminClientTableUser | null;
	commercialAssignments?: AdminClientTableAssignment[] | null;
};

// Adapta una entidad Cliente al formato visual reutilizable EntityTableItem.
export function mapClientsToEntityTableItems(
	clients: AdminClientTableSource[],
): EntityTableItem[] {
	return clients.map((client) => {
		const activeAssignment = Array.isArray(client.commercialAssignments)
			? (client.commercialAssignments[0] ?? null)
			: null;

		const assignedCommercial = activeAssignment?.commercial ?? null;
		const assignedCommercialUser = assignedCommercial?.user ?? null;

		const assignedCommercialName =
			assignedCommercialUser?.name?.trim() || "Sin comercial asignado";

		const assignedCommercialEmail =
			assignedCommercialUser?.email?.trim() || "-";

		return {
			id: client.id,
			title: client.name,
			subtitle:
				client.contact_name || client.user?.email || "Sin persona de contacto",
			imageUrl: client.user?.profile_image_url ?? null,
			category: client.province || client.city || null,
			status: assignedCommercial ? "Asignado" : "Sin asignar",
			primaryDate: client.created_at
				? new Date(client.created_at).toISOString()
				: null,
			badges: assignedCommercial
				? [
						{
							label: assignedCommercialName,
							className: "bg-cyan-100 text-cyan-800 border border-cyan-200",
						},
					]
				: [
						{
							label: "Pendiente de asignación",
							className: "bg-amber-100 text-amber-800 border border-amber-200",
						},
					],
			fields: [
				{
					label: "Correo",
					value: client.user?.email || "-",
					mobileHidden: true,
				},
				{
					label: "Teléfono",
					value: client.user?.phone || "-",
					mobileHidden: true,
				},
				{
					label: "Ciudad",
					value: client.city || "-",
					mobileHidden: true,
				},
				{
					label: "Provincia",
					value: client.province || "-",
					mobileHidden: true,
				},
				{
					label: "Comercial asignado",
					value: assignedCommercialName,
					mobileHidden: true,
				},
				{
					label: "Correo comercial",
					value: assignedCommercialEmail,
					mobileHidden: true,
				},
				{
					label: "Fecha asignación",
					value: formatDate(activeAssignment?.assigned_at),
					mobileHidden: true,
				},
			],
			actions: [
				{
					label: "Ver detalle",
					href: `/admin/clients/list/${client.id}`,
					variant: "primary",
				},
				{
					label: "Gestionar asignación",
					href: `/admin/clients/assignments?clientId=${client.id}`,
					variant: "secondary",
				},
			],
			searchText: [
				client.name,
				client.contact_name,
				client.city,
				client.province,
				client.user?.name,
				client.user?.email,
				client.user?.phone,
				assignedCommercialUser?.name,
				assignedCommercialUser?.email,
			]
				.filter(Boolean)
				.join(" "),
		};
	});
}
