export type CommercialProfileResponse = {
	id: string;
	workday_start_time: string | null;
	workday_end_time: string | null;
	delivery_visit_duration_minutes: number;
	routine_visit_duration_minutes: number;
	route_start_address: string | null;
	route_end_address: string | null;
	return_to_start: boolean;
	route_start_lat: string | null;
	route_start_lng: string | null;
	route_end_lat: string | null;
	route_end_lng: string | null;
};

export type AdminUpsertCommercialProfileBody = {
	userId?: string;
	employeeCode?: string | null;
	territory?: string | null;
	notes?: string | null;
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

export function buildAdminUpsertCommercialProfileInput(
	body: AdminUpsertCommercialProfileBody,
) {
	return {
		userId: String(body.userId ?? ""),
		employeeCode: body.employeeCode,
		territory: body.territory,
		notes: body.notes,
		workdayStartTime: body.workdayStartTime,
		workdayEndTime: body.workdayEndTime,
		deliveryVisitDurationMinutes: body.deliveryVisitDurationMinutes,
		routineVisitDurationMinutes: body.routineVisitDurationMinutes,
		routeStartAddress: body.routeStartAddress,
		routeEndAddress: body.routeEndAddress,
		returnToStart: body.returnToStart,
		routeStartLat: body.routeStartLat,
		routeStartLng: body.routeStartLng,
		routeEndLat: body.routeEndLat,
		routeEndLng: body.routeEndLng,
	};
}
