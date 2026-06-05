import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function ClientPromotionsLoading() {
	return (
		<RouteLoadingState
			title="Promociones"
			subtitle="Buscando promociones activas aplicables a tu perfil y segmento."
			variant="grid"
		/>
	);
}
