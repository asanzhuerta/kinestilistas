import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { SessionLike } from "@/lib/contracts/api";
import {
	applyRateLimit,
	createRateLimitExceededResponse,
	getClientIpFromHeaders,
	resolveApiRateLimitPolicy,
	resolveRateLimitIdentifier,
} from "@/lib/security/rate-limit";
import { parsePositiveIntegerValue } from "@/lib/utils/validation";

export type SessionUser = NonNullable<NonNullable<SessionLike>["user"]>;

type ApiErrorLike = {
	message: string;
	status: number;
	code?: string;
};

export async function getSessionUser() {
	const session = (await auth()) as SessionLike;
	return session?.user?.id ? session.user : null;
}

export async function requireRoleUser(role: string) {
	const user = await getSessionUser();
	return user?.role === role ? user : null;
}

export function jsonError(error: string, status: number, code?: string) {
	return NextResponse.json(code ? { error, code } : { error }, { status });
}

export function unauthorizedError(message = "No autorizado") {
	return jsonError(message, 401);
}

export function forbiddenError(message = "No autorizado", code?: string) {
	return jsonError(message, 403, code);
}

export function notFoundError(message = "No encontrado", code?: string) {
	return jsonError(message, 404, code);
}

export function badRequestError(message: string, code?: string) {
	return jsonError(message, 400, code);
}

export function getRequestSearchParams(request: Request) {
	return new URL(request.url).searchParams;
}

export async function enforceApiRateLimit(
	request: Request,
	user?: SessionUser | null,
) {
	const method = request.method.toUpperCase();

	if (method === "OPTIONS" || method === "HEAD") {
		return null;
	}

	const pathname = new URL(request.url).pathname;
	const policy = resolveApiRateLimitPolicy(pathname, method);

	if (!policy?.enabled) {
		return null;
	}

	const rateLimitUser =
		user ?? (policy.scope === "user_or_ip" ? await getSessionUser() : null);
	const ipAddress = getClientIpFromHeaders(request.headers);
	const identifier = resolveRateLimitIdentifier(policy, {
		ipAddress,
		userId: rateLimitUser?.id ?? null,
		email: rateLimitUser?.email ?? null,
	});
	const rateLimitResult = applyRateLimit(policy, identifier);

	if (!rateLimitResult.success) {
		return createRateLimitExceededResponse(policy, rateLimitResult);
	}

	return null;
}

export function parsePositiveInteger(
	value: string | null | undefined,
	fallback: number,
	max?: number,
) {
	const parsed = parsePositiveIntegerValue(value);

	if (parsed === null) {
		return fallback;
	}

	if (typeof max === "number") {
		return Math.min(parsed, max);
	}

	return parsed;
}

export function getOptionalNumberParam(
	searchParams: URLSearchParams,
	key: string,
) {
	const raw = searchParams.get(key);

	if (!raw) {
		return null;
	}

	const parsed = Number(raw);
	return Number.isFinite(parsed) ? parsed : null;
}

export async function readJsonBody<T>(request: Request) {
	return (await request.json()) as T;
}

export async function readOptionalStringField(
	request: Request,
	field: string,
) {
	const contentType = request.headers.get("content-type") ?? "";

	if (contentType.includes("application/json")) {
		const body = await request.json().catch(() => ({}));
		return String(body?.[field] ?? "").trim();
	}

	if (
		contentType.includes("application/x-www-form-urlencoded") ||
		contentType.includes("multipart/form-data")
	) {
		const formData = await request.formData();
		return String(formData.get(field) ?? "").trim();
	}

	return "";
}

export function isApiErrorLike(error: unknown): error is ApiErrorLike {
	return (
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof error.message === "string" &&
		"status" in error &&
		typeof error.status === "number"
	);
}

export function jsonFromError(error: unknown, fallbackMessage: string) {
	if (isApiErrorLike(error)) {
		return jsonError(error.message, error.status, error.code);
	}

	return jsonError(fallbackMessage, 500);
}

export function logApiError(context: string, error: unknown) {
	if (isApiErrorLike(error) && error.status < 500) {
		console.warn(
			`${context} controlled ${error.code ?? "API_ERROR"} (${error.status}): ${error.message}`,
		);
		return;
	}

	console.error(`${context} unexpected error:`, error);
}
