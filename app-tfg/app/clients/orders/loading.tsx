import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function ClientOrdersLoading() {
	return (
		<RouteLoadingState
			title="Pedidos"
			subtitle="Cargando tu borrador, historial de pedidos y opciones de producto."
			variant="detail"
		/>
	);
}
