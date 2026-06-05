import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function CommercialRoutesLoading() {
	return (
		<RouteLoadingState
			title="Ruta del día"
			subtitle="Calculando recorrido, tiempos estimados y margen operativo disponible."
			variant="map"
		/>
	);
}
