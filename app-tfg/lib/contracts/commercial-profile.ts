export type CommercialProfileResponse = {
	id: string;
	workday_start_time: string | null;
	workday_end_time: string | null;
	delivery_visit_duration_minutes: number;
	routine_visit_duration_minutes: number;
};

export type UpdateCommercialProfileBody = {
	workdayStartTime?: string | null;
	workdayEndTime?: string | null;
	deliveryVisitDurationMinutes?: number | string | null;
	routineVisitDurationMinutes?: number | string | null;
	routeStartAddress?: string | null;
	routeEndAddress?: string | null;
	returnToStart?: boolean;
	routeStartLat?: number | string | null;
	routeStartLng?: number | string | null;
	routeEndLat?: number | string | null;
	routeEndLng?: number | string | null;
};
