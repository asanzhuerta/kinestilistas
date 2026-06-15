import type { ObjectLiteral } from "typeorm";
import type { User } from "@/lib/typeorm/entities/User";
import {
	formatDateShort,
	getRoleClassesLight,
	getRoleLabel,
	getStatusClassesLight,
	getStatusLabel,
} from "@/lib/utils/user-utils";
import type { EntityTableItem } from "@/app/components/entity-table/entity-table-types";

// Adapta una entidad User al formato visual reutilizable EntityTableItem.
export function mapUserToEntityTableItem(user: ObjectLiteral): EntityTableItem {
	const typedUser = user as User;

	return {
		id: typedUser.id,
		title: typedUser.name,
		subtitle: typedUser.email,
		imageUrl: typedUser.profile_image_url,
		category: getRoleLabel(
			typedUser.role.code as "admin" | "client" | "commercial",
		),
		status: getStatusLabel(
			typedUser.status.code as "active" | "inactive" | "blocked",
		),
		primaryDate: typedUser.created_at.toISOString(),
		secondaryDate: typedUser.last_login_at
			? typedUser.last_login_at.toISOString()
			: null,
		badges: [
			{
				label: getRoleLabel(
					typedUser.role.code as "admin" | "client" | "commercial",
				),
				className: getRoleClassesLight(
					typedUser.role.code as "admin" | "client" | "commercial",
				),
			},
			{
				label: getStatusLabel(
					typedUser.status.code as "active" | "inactive" | "blocked",
				),
				className: getStatusClassesLight(
					typedUser.status.code as "active" | "inactive" | "blocked",
				),
			},
		],
		fields: [
			{ label: "Empresa", value: typedUser.company || "-" },
			{ label: "Teléfono", value: typedUser.phone || "-" },
			{
				label: "Alta",
				value: formatDateShort(typedUser.created_at.toISOString()),
			},
			{
				label: "Último acceso",
				value: formatDateShort(
					typedUser.last_login_at
						? typedUser.last_login_at.toISOString()
						: null,
				),
			},
		],
		actions: [
			{
				label: "Ver",
				href: `/admin/users/list/${typedUser.id}`,
				variant: "primary",
			},
			{
				label: "Editar",
				href: `/admin/users/list/${typedUser.id}/edit`,
				variant: "secondary",
			},
			...(typedUser.status.code !== "inactive"
				? [
						{
							label: "Desactivar",
							href: `/admin/users/list/${typedUser.id}/remove`,
							variant: "warning" as const,
						},
					]
				: []),
		],
		searchText: [
			typedUser.name,
			typedUser.email,
			typedUser.company,
			typedUser.phone,
			getRoleLabel(typedUser.role.code as "admin" | "client" | "commercial"),
			getStatusLabel(
				typedUser.status.code as "active" | "inactive" | "blocked",
			),
		]
			.filter(Boolean)
			.join(" "),
	};
}
