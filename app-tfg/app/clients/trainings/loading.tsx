import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function ClientTrainingsLoading() {
	return (
		<RouteLoadingState
			title="Formaciones"
			subtitle="Cargando eventos publicados, plazas e inscripciones."
			variant="grid"
		/>
	);
}
