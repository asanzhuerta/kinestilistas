import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function AdminAuditLoading() {
	return (
		<RouteLoadingState
			title="Auditoría"
			subtitle="Cargando accesos, acciones administrativas y filtros de trazabilidad."
			variant="table"
		/>
	);
}
