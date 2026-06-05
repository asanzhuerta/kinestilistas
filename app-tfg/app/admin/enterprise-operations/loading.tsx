import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function AdminEnterpriseOperationsLoading() {
	return (
		<RouteLoadingState
			title="Operaciones empresariales"
			subtitle="Revisando integraciones externas, configuraciones y propuestas de proveedor."
			variant="dashboard"
		/>
	);
}
