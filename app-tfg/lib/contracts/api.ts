export type ApiErrorResponse = {
	error?: string;
	message?: string;
	code?: string;
};

export type SessionLike = {
	user?: {
		id: string;
		role: string;
		email?: string | null;
	};
} | null;

export type RouteContext<TParams extends Record<string, string> = { id: string }> = {
	params: Promise<TParams>;
};
