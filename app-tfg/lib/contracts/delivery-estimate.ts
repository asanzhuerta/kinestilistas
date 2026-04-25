export type DeliveryEstimateStatus =
	| "scheduled"
	| "outside_visit_window"
	| "scheduled_without_eta"
	| "no_delivery_today"
	| "no_active_commercial";

export type DeliveryEstimateResponse = {
	status: DeliveryEstimateStatus;
	date: string;
	message: string;
	estimatedArrivalTime: string | null;
	sequence: number | null;
	windowStartTime: string | null;
	windowEndTime: string | null;
	commercialName: string | null;
};
