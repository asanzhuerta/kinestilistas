import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function AdminOrdersLoading() {
	return (
		<RouteLoadingState
			title="Pedidos"
			subtitle="Cargando pedidos, estados de cobro y datos operativos asociados."
			variant="table"
		/>
	);
}
