import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function ClientColorationLoading() {
	return (
		<RouteLoadingState
			title="Coloración"
			subtitle="Preparando cartas de color, referencias cromáticas y tonos disponibles."
			variant="grid"
		/>
	);
}
