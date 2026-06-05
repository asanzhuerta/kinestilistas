import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function ClientSalonClientsLoading() {
	return (
		<RouteLoadingState
			title="Fichas de salón"
			subtitle="Preparando clientes finales, historial técnico, plantillas e imágenes de resultado."
			variant="table"
		/>
	);
}
