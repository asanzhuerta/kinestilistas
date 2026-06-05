import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function AdminOperationsLoading() {
	return (
		<RouteLoadingState
			title="Operación transversal"
			subtitle="Calculando el estado agregado de auditoría, seguridad, soporte e integraciones."
			variant="dashboard"
		/>
	);
}
