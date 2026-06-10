import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function ClientOrdersLoading() {
	return (
		<RouteLoadingState
			title="Pedidos"
			subtitle="Cargando tu pedido en curso y opciones de producto."
			variant="detail"
		/>
	);
}
