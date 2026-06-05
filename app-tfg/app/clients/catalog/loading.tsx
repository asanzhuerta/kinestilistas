import RouteLoadingState from "@/app/components/loading/RouteLoadingState";

export default function ClientCatalogLoading() {
	return (
		<RouteLoadingState
			title="Catálogo"
			subtitle="Cargando productos activos, formatos, líneas comerciales y recursos técnicos."
			variant="grid"
		/>
	);
}
