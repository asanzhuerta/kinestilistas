import webpush from "web-push";
import type { PushSubscription } from "web-push";
import type { UserPushSubscription } from "@/lib/typeorm/entities/UserPushSubscription";

export type PushNotificationPayload = {
	title: string;
	body: string;
	url?: string;
	tag?: string;
};

type PushDeliveryResult =
	| { status: "sent" }
	| { status: "skipped"; reason: "not_configured" }
	| { status: "expired" }
	| { status: "failed"; reason: string };

const DEFAULT_PUSH_TTL_SECONDS = 2_419_200;
const PUSH_CONTENT_ENCODING = "aes128gcm";

export function getVapidPublicKey() {
	return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}

function getVapidConfig() {
	const publicKey = getVapidPublicKey();
	const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
	const subject =
		process.env.VAPID_SUBJECT?.trim() ||
		process.env.SMTP_FROM?.trim() ||
		process.env.MAIL_FROM?.trim();

	if (!publicKey || !privateKey || !subject) {
		return null;
	}

	return { publicKey, privateKey, subject };
}

export function isPushDeliveryConfigured() {
	return Boolean(getVapidConfig());
}

function buildPushDeliveryError(
	response: Response,
	body: string,
	endpoint: string,
) {
	const error = new Error("Received unexpected response code") as Error & {
		body: string;
		endpoint: string;
		headers: Record<string, string>;
		statusCode: number;
	};

	error.statusCode = response.status;
	error.headers = Object.fromEntries(response.headers.entries());
	error.body = body;
	error.endpoint = endpoint;

	return error;
}

function toWebPushSubscription(
	subscription: Pick<UserPushSubscription, "endpoint" | "p256dh" | "auth">,
): PushSubscription {
	return {
		endpoint: subscription.endpoint,
		keys: {
			p256dh: subscription.p256dh,
			auth: subscription.auth,
		},
	};
}

async function sendPushNotificationRequest(
	subscription: PushSubscription,
	payload: string,
	config: NonNullable<ReturnType<typeof getVapidConfig>>,
) {
	const endpointUrl = new URL(subscription.endpoint);
	const encrypted = webpush.encrypt(
		subscription.keys.p256dh,
		subscription.keys.auth,
		payload,
		PUSH_CONTENT_ENCODING,
	);
	const vapidHeaders = webpush.getVapidHeaders(
		endpointUrl.origin,
		config.subject,
		config.publicKey,
		config.privateKey,
		PUSH_CONTENT_ENCODING,
	);
	const headers = new Headers({
		Authorization: vapidHeaders.Authorization,
		"Content-Encoding": PUSH_CONTENT_ENCODING,
		"Content-Type": "application/octet-stream",
		TTL: String(DEFAULT_PUSH_TTL_SECONDS),
		Urgency: "normal",
	});

	const response = await fetch(endpointUrl, {
		method: "POST",
		headers,
		body: new Uint8Array(encrypted.cipherText),
	});
	const responseBody = await response.text();

	if (!response.ok) {
		throw buildPushDeliveryError(response, responseBody, subscription.endpoint);
	}
}

export async function sendPushNotification(
	subscription: Pick<UserPushSubscription, "endpoint" | "p256dh" | "auth">,
	payload: PushNotificationPayload,
): Promise<PushDeliveryResult> {
	const config = getVapidConfig();

	if (!config) {
		return { status: "skipped", reason: "not_configured" };
	}

	try {
		await sendPushNotificationRequest(
			toWebPushSubscription(subscription),
			JSON.stringify(payload),
			config,
		);

		return { status: "sent" };
	} catch (error) {
		const maybeStatusCode =
			typeof error === "object" && error !== null && "statusCode" in error
				? Number((error as { statusCode?: unknown }).statusCode)
				: null;

		if (maybeStatusCode === 404 || maybeStatusCode === 410) {
			return { status: "expired" };
		}

		const reason = error instanceof Error ? error.message : "unknown_error";
		console.error("[notifications/push] delivery failed:", reason);
		return { status: "failed", reason };
	}
}
