import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function AdminCatalogLoading() {
	return (
		<RouteLoadingState
			title="Catálogo"
			subtitle="Preparando productos, jerarquías comerciales, cartas de color y recursos de apoyo."
			variant="grid"
		/>
	);
}
