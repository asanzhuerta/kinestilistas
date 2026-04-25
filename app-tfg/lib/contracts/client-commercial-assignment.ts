import type {
	CommercialClient,
	CommercialSummary,
} from "@/lib/contracts/commercial-client";

export type ClientCommercialAssignmentMode =
	| "assign"
	| "reassign"
	| "unassign";

export type ClientCommercialAssignment = {
	id: string;
	client_id: string;
	commercial_id: string;
	assigned_at: string;
	unassigned_at: string | null;
	notes: string | null;
	client: CommercialClient | null;
	commercial: CommercialSummary | null;
};

export type UpsertClientCommercialAssignmentBody = {
	mode?: ClientCommercialAssignmentMode;
	clientId?: string;
	commercialId?: string;
	notes?: string | null;
};
