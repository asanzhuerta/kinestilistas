export type PromotionStatus = "draft" | "active" | "archived";
export type TrainingEventStatus =
	| "draft"
	| "published"
	| "cancelled"
	| "completed";
export type TrainingEventModality = "in_person" | "online" | "hybrid";
export type TrainingEnrollmentStatus = "registered" | "cancelled" | "attended";
export type AppReminderStatus = "pending" | "done" | "cancelled";

export type AdminUpsertCustomerSegmentBody = {
	code?: string;
	name?: string;
	description?: string | null;
	criteria?: string | null;
};

export type AdminAssignClientSegmentBody = {
	clientId?: string;
	segmentId?: string;
	notes?: string | null;
};

export type AdminUpsertPromotionBody = {
	title?: string;
	description?: string;
	promotionType?: string;
	benefit?: string;
	startDate?: string;
	endDate?: string;
	status?: PromotionStatus;
	productId?: string | null;
	productLineId?: string | null;
	clientId?: string | null;
	customerSegmentId?: string | null;
};

export type AdminUpsertTrainingEventBody = {
	title?: string;
	description?: string;
	startsAt?: string;
	location?: string | null;
	modality?: TrainingEventModality;
	content?: string | null;
	status?: TrainingEventStatus;
	capacity?: number | string | null;
};

export type TrainingEnrollmentBody = {
	notes?: string | null;
};

export type UpsertAppReminderBody = {
	title?: string;
	body?: string;
	scheduledAt?: string;
	status?: AppReminderStatus;
};

export function buildAdminUpsertCustomerSegmentInput(
	body: AdminUpsertCustomerSegmentBody,
) {
	return {
		code: body.code,
		name: body.name,
		description: body.description,
		criteria: body.criteria,
	};
}

export function buildAdminAssignClientSegmentInput(
	body: AdminAssignClientSegmentBody,
) {
	return {
		clientId: body.clientId,
		segmentId: body.segmentId,
		notes: body.notes,
	};
}

export function buildAdminUpsertPromotionInput(
	body: AdminUpsertPromotionBody,
) {
	return {
		title: body.title,
		description: body.description,
		promotionType: body.promotionType,
		benefit: body.benefit,
		startDate: body.startDate,
		endDate: body.endDate,
		status: body.status,
		productId: body.productId,
		productLineId: body.productLineId,
		clientId: body.clientId,
		customerSegmentId: body.customerSegmentId,
	};
}

export function buildAdminUpsertTrainingEventInput(
	body: AdminUpsertTrainingEventBody,
) {
	return {
		title: body.title,
		description: body.description,
		startsAt: body.startsAt,
		location: body.location,
		modality: body.modality,
		content: body.content,
		status: body.status,
		capacity: body.capacity,
	};
}

export function buildTrainingEnrollmentInput(body: TrainingEnrollmentBody) {
	return {
		notes: body.notes,
	};
}

export function buildUpsertAppReminderInput(body: UpsertAppReminderBody) {
	return {
		title: body.title,
		body: body.body,
		scheduledAt: body.scheduledAt,
		status: body.status,
	};
}
