import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";
import EntityTable from "@/app/components/entity-table/EntityTable";
import { listUserRequests } from "@/lib/typeorm/services/users/request";
import { mapRequestToEntityTableItem } from "./request-table-mapper";
import { requireAdminSession } from "@/lib/auth/require-session";

// admin/users/requests
// Página que muestra la lista de solicitudes de registro pendientes
// dentro del panel de administración.
export default async function RequestsPage() {
	// CONTROL DE ACCESO
	// Se asegura de que el usuario esté autenticado y tenga rol de administrador.
	await requireAdminSession();

	// CARGA DE DATOS
	// Recupera todas las solicitudes y conserva solo las que siguen pendientes.
	const rawRequests = await listUserRequests();

	// TRANSFORMACIÓN DE DATOS
	// Adapta las solicitudes pendientes al formato visual reutilizable.
	const items = rawRequests
		.filter((request) => request.status.code === "pending")
		.map(mapRequestToEntityTableItem);

	// RENDER
	return (
		<PageTransition>
			<H1Title
				title="Solicitudes de registro"
				subtitle="Lista de solicitudes pendientes"
			/>

			<div className="mx-auto mt-6 w-full max-w-7xl">
				<EntityTable
					items={items}
					config={{
						categoryLabel: "Rol solicitado",
						statusLabel: "Estado",
						showImageFilter: false,
						showHideInactiveToggle: false,
						defaultHideInactive: false,
						emptyMessage: "No hay solicitudes pendientes.",
					}}
				/>
			</div>
		</PageTransition>
	);
}
