import { NextResponse } from "next/server";
import { auth } from "@/auth";
import type { SessionLike } from "@/lib/contracts/api";

export type SessionUser = NonNullable<NonNullable<SessionLike>["user"]>;

type ApiErrorLike = {
	message: string;
	status: number;
	code?: string;
};

export async function getSessionUser() {
	const session = (await auth()) as SessionLike;
	return session?.user ?? null;
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

export function parsePositiveInteger(
	value: string | null | undefined,
	fallback: number,
	max?: number,
) {
	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed <= 0) {
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
