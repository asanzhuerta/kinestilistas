import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function ClientSalonClientHistoryLoading() {
	return (
		<RouteLoadingState
			title="Historial técnico"
			subtitle="Cargando servicios registrados."
			variant="table"
		/>
	);
}
