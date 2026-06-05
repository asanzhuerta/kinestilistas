import EntityTable from "@/app/components/entity-table/EntityTable";
import { listClients } from "@/lib/typeorm/services/commercial/client";
import { mapClientsToEntityTableItems } from "./client-table-mapper";

export default async function AdminClientsPage() {
	const clients = await listClients();
	const items = mapClientsToEntityTableItems(clients);

	return (
		<div className="space-y-6">
			<EntityTable
				items={items}
				config={{
					categoryLabel: "Provincia",
					statusLabel: "Asignación",
					showImageFilter: true,
					emptyMessage: "No hay clientes registrados.",
				}}
			/>
		</div>
	);
}
