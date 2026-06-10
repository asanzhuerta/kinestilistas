export type CommercialVisitStatusCode =
	| "planned"
	| "completed"
	| "cancelled"
	| "postponed";

export type CommercialVisitTypeCode = "delivery" | "routine";

export type CommercialVisitClientUser = {
	id: string;
	name: string;
	email: string;
	phone: string | null;
	profile_image_url: string | null;
};

export type CommercialVisitClient = {
	id: string;
	name: string;
	contact_name: string | null;
	city: string;
	province: string | null;
	visit_window_start_time: string | null;
	visit_window_end_time: string | null;
	user: CommercialVisitClientUser | null;
};

export type CommercialVisitCommercialUser = {
	id: string;
	name: string;
	email: string;
	phone: string | null;
};

export type CommercialVisitCommercial = {
	id: string;
	employee_code: string | null;
	territory: string | null;
	user: CommercialVisitCommercialUser | null;
};

export type CommercialVisitStatus = {
	id: number;
	code?: CommercialVisitStatusCode;
	name?: string;
};

export type CommercialVisitType = {
	id: number;
	code?: CommercialVisitTypeCode;
	name?: string;
};

export type CommercialVisit = {
	id: string;
	client_id: string;
	commercial_id: string;
	scheduled_for_date: string;
	visit_type_id: number;
	status_id: number;
	notes: string | null;
	result: string | null;
	client: CommercialVisitClient | null;
	commercial: CommercialVisitCommercial | null;
	visitType: CommercialVisitType | null;
	status: CommercialVisitStatus | null;
};

export type CommercialVisitDeliveryOrder = {
	id: string;
	delivery_visit_id: string | null;
	status_id: number;
	status_name: string;
	total_amount: string;
	notes: string | null;
	created_at: string;
	updated_at: string;
	line_count: number;
};

export type CommercialVisitDetail = CommercialVisit & {
	linkedOrders: CommercialVisitDeliveryOrder[];
	availableOrdersForDelivery: CommercialVisitDeliveryOrder[];
	completedElsewhereOrders: CommercialVisitDeliveryOrder[];
};

export type CreateCommercialVisitBody = {
	clientId?: string;
	commercialId?: string;
	scheduledForDate?: string;
	visitTypeId?: number;
	notes?: string | null;
	orderIds?: string[];
};

export type UpdateCommercialVisitBody = {
	scheduledForDate?: string;
	visitTypeId?: number;
	statusId?: number;
	notes?: string | null;
	result?: string | null;
	deliveredOrderQrs?: string[];
	scannedOrderQr?: string;
	orderIds?: string[];
};
