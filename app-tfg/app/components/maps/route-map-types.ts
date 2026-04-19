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