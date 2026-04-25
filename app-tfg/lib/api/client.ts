import type { ApiErrorResponse } from "@/lib/contracts/api";

export class ApiClientError extends Error {
	status: number;
	code?: string;
	payload?: unknown;

	constructor(message: string, options: {
		status: number;
		code?: string;
		payload?: unknown;
	}) {
		super(message);
		this.name = "ApiClientError";
		this.status = options.status;
		this.code = options.code;
		this.payload = options.payload;
	}
}

export function extractApiErrorMessage(
	payload: unknown,
	fallbackMessage: string,
) {
	if (!payload || typeof payload !== "object") {
		return fallbackMessage;
	}

	if ("error" in payload && typeof payload.error === "string" && payload.error) {
		return payload.error;
	}

	if (
		"message" in payload &&
		typeof payload.message === "string" &&
		payload.message
	) {
		return payload.message;
	}

	return fallbackMessage;
}

export async function readJsonResponse<T>(response: Response) {
	return (await response.json().catch(() => null)) as T | null;
}

export async function requestJson<T>(
	input: RequestInfo | URL,
	options: (RequestInit & { fallbackMessage?: string }) | undefined = undefined,
) {
	const { fallbackMessage = "No se pudo completar la solicitud", ...init } =
		options ?? {};
	const response = await fetch(input, init);
	const payload = await readJsonResponse<T | ApiErrorResponse>(response);

	if (!response.ok) {
		const code =
			payload &&
			typeof payload === "object" &&
			"code" in payload &&
			typeof payload.code === "string"
				? payload.code
				: undefined;

		throw new ApiClientError(
			extractApiErrorMessage(payload, fallbackMessage),
			{
				status: response.status,
				code,
				payload,
			},
		);
	}

	return payload as T;
}
