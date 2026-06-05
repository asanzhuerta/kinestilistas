import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function AdminClientsLoading() {
	return (
		<RouteLoadingState
			title="Clientes"
			subtitle="Cargando clientes profesionales, asignaciones y datos de cartera."
			variant="table"
		/>
	);
}
