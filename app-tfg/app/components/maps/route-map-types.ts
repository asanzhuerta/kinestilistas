// --------------------------------------------------------------------------
// Tipos base reutilizables para mapas y previews de ruta
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
	hasRouteStartConfig: boolean;
	hasRouteEndConfig: boolean;
};