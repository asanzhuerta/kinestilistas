import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function CommercialClientsLoading() {
	return (
		<RouteLoadingState
			title="Clientes asignados"
			subtitle="Preparando fichas comerciales, visitas y datos de seguimiento."
			variant="table"
		/>
	);
}
