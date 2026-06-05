import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function AdminCommunicationsLoading() {
	return (
		<RouteLoadingState
			title="Comunicaciones"
			subtitle="Cargando segmentos, promociones, formaciones, notificaciones y recordatorios."
			variant="dashboard"
		/>
	);
}
