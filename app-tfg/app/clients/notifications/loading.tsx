import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function ClientNotificationsLoading() {
	return (
		<RouteLoadingState
			title="Avisos"
			subtitle="Cargando notificaciones internas y estado de lectura."
			variant="table"
		/>
	);
}
