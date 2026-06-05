import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function CommercialCatalogLoading() {
	return (
		<RouteLoadingState
			title="Catálogo"
			subtitle="Cargando la oferta profesional disponible para tu cartera."
			variant="grid"
		/>
	);
}
