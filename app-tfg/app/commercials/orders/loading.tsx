import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function CommercialOrdersLoading() {
	return (
		<RouteLoadingState
			title="Pedidos comerciales"
			subtitle="Cargando borradores, pedidos confirmados y opciones de producto."
			variant="detail"
		/>
	);
}
