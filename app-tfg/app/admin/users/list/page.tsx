import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";
import EntityTable from "@/app/components/entity-table/EntityTable";
import { listUsers } from "@/lib/typeorm/services/users/user";
import { mapUserToEntityTableItem } from "./user-table-mapper";
import { requireAdminSession } from "@/lib/auth/require-session";
// admin/users/list
// Página que muestra el listado general de usuarios del sistema
// dentro del panel de administración.
export default async function UsuariosPage() {
	// CONTROL DE ACCESO
	// Se asegura de que el usuario esté autenticado y tenga rol de administrador.
	await requireAdminSession();

	// CARGA DE DATOS
	// Recupera el listado completo de usuarios y lo adapta al formato visual común.
	const items = (await listUsers()).map(mapUserToEntityTableItem);

	// RENDER
	return (
		<PageTransition>
			<H1Title title="Usuarios" subtitle="Lista de usuarios del sistema" />

			<div className="mx-auto mt-6 w-full max-w-7xl">
				<EntityTable
					items={items}
					config={{
						categoryLabel: "Rol",
						statusLabel: "Estado",
						showImageFilter: true,
						showHideInactiveToggle: true,
						hideInactiveLabel: "Ocultar usuarios inactivos",
						defaultHideInactive: true,
						emptyMessage: "No hay usuarios que coincidan con los filtros.",
					}}
				/>
			</div>
		</PageTransition>
	);
}
