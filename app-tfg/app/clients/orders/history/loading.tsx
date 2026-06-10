import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function ClientOrdersHistoryLoading() {
	return (
		<RouteLoadingState
			title="Historial de pedidos"
			subtitle="Cargando pedidos registrados."
			variant="table"
		/>
	);
}
