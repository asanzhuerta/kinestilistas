import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function AdminUsersLoading() {
	return (
		<RouteLoadingState
			title="Usuarios"
			subtitle="Preparando usuarios, solicitudes de alta y acciones de administración."
			variant="table"
		/>
	);
}
