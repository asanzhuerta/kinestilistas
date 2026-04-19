// --------------------------------------------------------------------------
// Tipos base reutilizables para mapas y rutas
// --------------------------------------------------------------------------
export type RoutePoint = {
	id: string;
	label: string;
	lat: number;
	lng: number;
	description?: string | null;
};

export type CommercialRoutePreviewResponse = {
	startPoint: RoutePoint | null;
	endPoint: RoutePoint | null;
	waypoints: RoutePoint[];
	totalAssignedClients: number;
	mappedClients: number;
	skippedClients: number;

	// Indica si se ha podido usar la ubicación actual del comercial
	usingCurrentLocation: boolean;

	// Indica si el punto de salida usado viene del fallback guardado en perfil
	usingSavedStartFallback: boolean;

	// Indica si existe un final de ruta configurable
	hasConfiguredEndPoint: boolean;
};