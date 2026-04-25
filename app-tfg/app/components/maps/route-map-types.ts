// --------------------------------------------------------------------------
// Tipos base reutilizables para mapas y rutas
// --------------------------------------------------------------------------
export type RoutePoint = {
	id: string;
	label: string;
	lat: number;
	lng: number;
	description?: string | null;
	sequence?: number | null;
	estimatedArrivalTime?: string | null;
	estimatedDepartureTime?: string | null;
	approxDistanceKmFromPrevious?: number | null;
	approxTravelMinutesFromPrevious?: number | null;
	waitMinutesBeforeVisit?: number | null;
	stopDurationMinutes?: number | null;
	visitWindowStartTime?: string | null;
	visitWindowEndTime?: string | null;
	hasDeliveryVisit?: boolean;
	hasRoutineVisit?: boolean;
	visitCount?: number | null;
	isPastVisitWindow?: boolean;
};

export type CommercialRouteTimingSummary = {
	hasWorkdayConfig: boolean;
	hasValidWorkdayRange: boolean;
	workdayStartTime: string | null;
	workdayEndTime: string | null;
	currentTimeLabel: string;
	totalWorkdayMinutes: number | null;
	elapsedWorkdayMinutes: number | null;
	plannedVisitsCount: number;
	deliveryVisitsCount: number;
	routineVisitsCount: number;
	totalPlannedVisitMinutes: number;
	approxTravelMinutes: number;
	totalWaitingMinutes: number;
	totalCommittedRouteMinutes: number;
	remainingWorkdayMinutes: number | null;
	remainingOperationalMarginMinutes: number | null;
	overbookedMinutes: number | null;
	pastWindowStopsCount: number;
};

export type CommercialRoutePreviewResponse = {
	startPoint: RoutePoint | null;
	endPoint: RoutePoint | null;
	waypoints: RoutePoint[];
	totalAssignedClients: number;
	mappedClients: number;
	skippedClients: number;
	timingSummary: CommercialRouteTimingSummary;

	// Indica si se ha podido usar la ubicacion actual del comercial
	usingCurrentLocation: boolean;

	// Indica si el punto de salida usado viene del fallback guardado en perfil
	usingSavedStartFallback: boolean;

	// Indica si existe un final de ruta configurable
	hasConfiguredEndPoint: boolean;
};
