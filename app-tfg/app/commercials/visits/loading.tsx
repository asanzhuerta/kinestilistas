import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function CommercialVisitsLoading() {
	return (
		<RouteLoadingState
			title="Visitas comerciales"
			subtitle="Cargando agenda, estados de visita y acciones de seguimiento."
			variant="table"
		/>
	);
}
