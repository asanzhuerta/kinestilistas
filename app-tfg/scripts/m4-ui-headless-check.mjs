import fs from "node:fs/promises";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const BASE_URL = process.env.M4_UI_BASE_URL ?? "http://127.0.0.1:3000";
const DEBUG_URL = process.env.M4_UI_DEBUG_URL ?? "http://127.0.0.1:9222";
const SCREENSHOT_DIR =
	process.env.M4_UI_SCREENSHOT_DIR ?? "C:/Users/MADAO/Desktop/TFG-AlejandroSanzHuerta/app-tfg/.codex-artifacts/m4-ui-evidence";

await fs.mkdir(SCREENSHOT_DIR, { recursive: true });

async function fetchJson(url, options) {
	const response = await fetch(url, options);

	if (!response.ok) {
		throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
	}

	return response.json();
}

class CDPClient {
	constructor(wsUrl) {
		this.ws = new WebSocket(wsUrl);
		this.nextId = 1;
		this.pending = new Map();
		this.eventWaiters = [];
		this.listeners = [];
		this.ready = new Promise((resolve, reject) => {
			this.ws.addEventListener("open", resolve, { once: true });
			this.ws.addEventListener("error", reject, { once: true });
		});

		this.ws.addEventListener("message", (event) => {
			const message = JSON.parse(String(event.data));

			if (typeof message.id === "number") {
				const pending = this.pending.get(message.id);

				if (!pending) {
					return;
				}

				this.pending.delete(message.id);

				if (message.error) {
					pending.reject(new Error(message.error.message || "CDP error"));
					return;
				}

				pending.resolve(message.result ?? {});
				return;
			}

			for (const waiter of [...this.eventWaiters]) {
				const sameMethod = waiter.method === message.method;
				const sameSession =
					waiter.sessionId === undefined || waiter.sessionId === message.sessionId;

				if (!sameMethod || !sameSession) {
					continue;
				}

				this.eventWaiters = this.eventWaiters.filter(
					(currentWaiter) => currentWaiter !== waiter,
				);
				waiter.resolve(message.params ?? {});
			}

			for (const listener of this.listeners) {
				listener(message);
			}
		});
	}

	async call(method, params = {}, sessionId) {
		await this.ready;

		const id = this.nextId++;
		const payload = {
			id,
			method,
			params,
		};

		if (sessionId) {
			payload.sessionId = sessionId;
		}

		const responsePromise = new Promise((resolve, reject) => {
			this.pending.set(id, { resolve, reject });
		});

		this.ws.send(JSON.stringify(payload));
		return responsePromise;
	}

	waitForEvent(method, sessionId) {
		return new Promise((resolve) => {
			this.eventWaiters.push({ method, sessionId, resolve });
		});
	}

	onEvent(listener) {
		this.listeners.push(listener);

		return () => {
			this.listeners = this.listeners.filter(
				(currentListener) => currentListener !== listener,
			);
		};
	}

	async close() {
		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.close();
		}
	}
}

async function createPage(client, url) {
	const { targetId } = await client.call("Target.createTarget", {
		url: "about:blank",
	});
	const { sessionId } = await client.call("Target.attachToTarget", {
		targetId,
		flatten: true,
	});

	await client.call("Page.enable", {}, sessionId);
	await client.call("Runtime.enable", {}, sessionId);
	await client.call("Network.enable", {}, sessionId);
	await navigate(client, sessionId, url);

	return { targetId, sessionId };
}

async function navigate(client, sessionId, url) {
	const loadEvent = client.waitForEvent("Page.loadEventFired", sessionId);
	await client.call("Page.navigate", { url }, sessionId);
	await loadEvent;
	await delay(1400);
}

async function evaluate(client, sessionId, expression, awaitPromise = false) {
	const result = await client.call(
		"Runtime.evaluate",
		{
			expression,
			awaitPromise,
			returnByValue: true,
		},
		sessionId,
	);

	return result.result?.value;
}

async function captureScreenshot(client, sessionId, fileName) {
	const { data } = await client.call(
		"Page.captureScreenshot",
		{ format: "png", fromSurface: true },
		sessionId,
	);

	const filePath = path.join(SCREENSHOT_DIR, fileName);
	await fs.writeFile(filePath, Buffer.from(data, "base64"));
	return filePath;
}

function summarizeRemoteArgs(args = []) {
	return args
		.map((arg) => arg.value ?? arg.description ?? arg.unserializableValue ?? "")
		.map((value) => String(value).trim())
		.filter(Boolean)
		.join(" ");
}

function createDiagnostics(sessionId) {
	return {
		sessionId,
		consoleErrors: [],
		runtimeExceptions: [],
		networkFailures: [],
		httpErrors: [],
		apiRequestCounts: {},
	};
}

function collectDiagnostics(client, diagnostics) {
	return client.onEvent((message) => {
		if (message.sessionId !== diagnostics.sessionId) {
			return;
		}

		if (message.method === "Runtime.consoleAPICalled") {
			if (message.params?.type === "error") {
				diagnostics.consoleErrors.push(
					summarizeRemoteArgs(message.params.args).slice(0, 300),
				);
			}

			return;
		}

		if (message.method === "Runtime.exceptionThrown") {
			diagnostics.runtimeExceptions.push(
				String(
					message.params?.exceptionDetails?.text ??
						message.params?.exceptionDetails?.exception?.description ??
						"Runtime exception",
				).slice(0, 300),
			);
			return;
		}

		if (message.method === "Network.loadingFailed") {
			diagnostics.networkFailures.push(
				String(message.params?.errorText ?? "Network loading failed").slice(0, 300),
			);
			return;
		}

		if (message.method === "Network.responseReceived") {
			const responseUrl = message.params?.response?.url;
			const responseStatus = message.params?.response?.status;

			if (typeof responseUrl !== "string" || typeof responseStatus !== "number") {
				return;
			}

			let pathname = responseUrl;

			try {
				pathname = new URL(responseUrl).pathname;
			} catch {
				// Keep the raw URL if parsing fails.
			}

			if (pathname.startsWith("/api/")) {
				diagnostics.apiRequestCounts[pathname] =
					(diagnostics.apiRequestCounts[pathname] ?? 0) + 1;
			}

			if (responseStatus >= 400) {
				diagnostics.httpErrors.push(`${responseStatus} ${pathname}`);
			}
		}
	});
}

async function scrollIntoView(client, sessionId, selector) {
	await client.call(
		"Runtime.evaluate",
		{
			expression: `
				(() => {
					const element = document.querySelector(${JSON.stringify(selector)});
					if (!element) {
						return false;
					}

					element.scrollIntoView({ block: 'center', behavior: 'instant' });
					return true;
				})()
			`,
			returnByValue: true,
		},
		sessionId,
	);
	await delay(700);
}

function loginExpression(identifier, password, landingPath) {
	const callbackUrl = `${BASE_URL}${landingPath}`;

	return `
		(async () => {
			const csrfResponse = await fetch('/api/auth/csrf', {
				credentials: 'same-origin'
			});
			const csrfPayload = await csrfResponse.json();
			const body = new URLSearchParams({
				identifier: ${JSON.stringify(identifier)},
				password: ${JSON.stringify(password)},
				csrfToken: csrfPayload.csrfToken,
				callbackUrl: ${JSON.stringify(callbackUrl)},
				json: 'true'
			});
			const loginResponse = await fetch('/api/auth/callback/credentials?json=true', {
				method: 'POST',
				credentials: 'same-origin',
				headers: {
					'Content-Type': 'application/x-www-form-urlencoded'
				},
				body
			});

			if (!loginResponse.ok) {
				throw new Error('Login HTTP ' + loginResponse.status);
			}

			return true;
		})()
	`;
}

async function loginAs(client, sessionId, identifier, password, landingPath) {
	await navigate(client, sessionId, `${BASE_URL}/login`);

	await evaluate(
		client,
		sessionId,
		loginExpression(identifier, password, landingPath),
		true,
	);
	await navigate(client, sessionId, `${BASE_URL}${landingPath}`);
	await delay(2600);

	return evaluate(client, sessionId, "location.pathname");
}

const browserInfo = await fetchJson(`${DEBUG_URL}/json/version`);
const client = new CDPClient(browserInfo.webSocketDebuggerUrl);
const { sessionId } = await createPage(client, `${BASE_URL}/login`);
const diagnostics = createDiagnostics(sessionId);
const detachDiagnostics = collectDiagnostics(client, diagnostics);

const summary = {};

console.error("[m4-ui] checking commercial visits");
summary.commercialPath = await loginAs(
	client,
	sessionId,
	"comercial@email.com",
	"comercial123$",
	"/commercials/visits",
);
summary.commercialVisits = await evaluate(
	client,
	sessionId,
	`(() => {
		const text = document.body.innerText
			.normalize('NFD')
			.replace(/[\\u0300-\\u036f]/g, '')
			.toLowerCase();
		return {
			path: location.pathname,
			hasPendingTrayTitle: text.includes('pedidos confirmados sin reparto asignado'),
			hasPendingTrayCta: text.includes('crear reparto manual'),
			hasPendingTrayEvidence:
				text.includes('no hay pedidos confirmados pendientes de reparto ahora mismo.') ||
				text.includes('crear reparto con estos pedidos') ||
				text.includes('ver pedido'),
			hasFilters: text.includes('filtros') && text.includes('nueva visita')
		};
	})()`,
	true,
);
summary.commercialVisitsScreenshot = await captureScreenshot(
	client,
	sessionId,
	"commercial-visits.png",
);

console.error("[m4-ui] checking commercial visit detail");
await navigate(
	client,
	sessionId,
	`${BASE_URL}/commercials/visits/2bfecabf-6992-4c72-89c0-485555e53ff7`,
);
summary.commercialVisitDetail = await evaluate(
	client,
	sessionId,
	`(() => {
		const text = document.body.innerText
			.normalize('NFD')
			.replace(/[\\u0300-\\u036f]/g, '')
			.toLowerCase();
		return {
			path: location.pathname,
			hasLinkedOrdersSection: text.includes('pedidos vinculados al reparto'),
			hasLinkedOrdersEvidence:
				text.includes('pedido ') ||
				text.includes('no hay pedidos confirmados disponibles para este cliente en este momento.'),
			hasUpdateForm: text.includes('actualizar visita') && text.includes('guardar cambios')
		};
	})()`,
	true,
);

if (!summary.commercialVisitDetail.hasLinkedOrdersSection) {
	await delay(3500);
	await navigate(
		client,
		sessionId,
		`${BASE_URL}/commercials/visits/2bfecabf-6992-4c72-89c0-485555e53ff7`,
	);
	summary.commercialVisitDetail = await evaluate(
		client,
		sessionId,
		`(() => {
			const text = document.body.innerText
				.normalize('NFD')
				.replace(/[\\u0300-\\u036f]/g, '')
				.toLowerCase();
			return {
				path: location.pathname,
				hasLinkedOrdersSection: text.includes('pedidos vinculados al reparto'),
				hasLinkedOrdersEvidence:
					text.includes('pedido ') ||
					text.includes('no hay pedidos confirmados disponibles para este cliente en este momento.'),
				hasUpdateForm: text.includes('actualizar visita') && text.includes('guardar cambios')
			};
		})()`,
		true,
	);
}

summary.commercialVisitDetailScreenshot = await captureScreenshot(
	client,
	sessionId,
	"commercial-visit-detail.png",
);

console.error("[m4-ui] checking QR validation state on postponed delivery visit");
await navigate(
	client,
	sessionId,
	`${BASE_URL}/commercials/visits/0a650fea-1ab3-4353-9e78-2d3ea26b4f60`,
);
await delay(3500);
await client.call(
	"Runtime.evaluate",
	{
		expression: `
			(() => {
				const statusSelect = document.querySelector('#visit-status-id');
				if (!statusSelect) {
					return false;
				}
				statusSelect.value = '2';
				statusSelect.dispatchEvent(new Event('change', { bubbles: true }));
				return true;
			})()
		`,
		returnByValue: true,
	},
	sessionId,
);
await delay(1200);
summary.commercialVisitQrValidation = await evaluate(
	client,
	sessionId,
	`(() => {
		const text = document.body.innerText
			.normalize('NFD')
			.replace(/[\\u0300-\\u036f]/g, '')
			.toLowerCase();
		return {
			path: location.pathname,
			hasQrValidationPrompt:
				text.includes('qr de paquetes entregados') &&
				text.includes('debes aportar un qr por cada pedido vinculado al reparto')
		};
	})()`,
	true,
);
await scrollIntoView(client, sessionId, "#visit-delivered-order-qrs");
summary.commercialVisitQrValidationScreenshot = await captureScreenshot(
	client,
	sessionId,
	"commercial-visit-qr-validation.png",
);

console.error("[m4-ui] checking handled endpoint failure");
await navigate(
	client,
	sessionId,
	`${BASE_URL}/commercials/visits/00000000-0000-0000-0000-000000000000`,
);
await delay(1200);
summary.commercialVisitErrorHandling = await evaluate(
	client,
	sessionId,
	`(() => {
		const text = document.body.innerText
			.normalize('NFD')
			.replace(/[\\u0300-\\u036f]/g, '')
			.toLowerCase();
		return {
			path: location.pathname,
			hasFriendlyError:
				text.includes('no se pudo cargar la visita') ||
				text.includes('error al obtener la visita') ||
				text.includes('visita no encontrada')
		};
	})()`,
	true,
);
summary.commercialVisitErrorHandlingScreenshot = await captureScreenshot(
	client,
	sessionId,
	"commercial-visit-error.png",
);

console.error("[m4-ui] checking commercial orders payment summary");
await navigate(client, sessionId, `${BASE_URL}/commercials/orders`);
summary.commercialOrdersPaymentSummary = await evaluate(
	client,
	sessionId,
	`(() => {
		const text = document.body.innerText
			.normalize('NFD')
			.replace(/[\\u0300-\\u036f]/g, '')
			.toLowerCase();
		return {
			path: location.pathname,
			hasPendingAndPaid: text.includes('pendientes de cobro') && text.includes('cobrados'),
			hasOrderPaymentText:
				text.includes('método de cobro') ||
				text.includes('cobrado') ||
				text.includes('pendiente')
		};
	})()`,
	true,
);
summary.commercialOrdersPaymentSummaryScreenshot = await captureScreenshot(
	client,
	sessionId,
	"commercial-orders-payment-summary.png",
);

console.error("[m4-ui] checking commercial delivered order detail");
await navigate(
	client,
	sessionId,
	`${BASE_URL}/commercials/orders/2ba93afe-01dd-4621-9e1d-5f9b81fcc8f2`,
);
summary.commercialDeliveredOrder = await evaluate(
	client,
	sessionId,
	`(() => {
		const text = document.body.innerText
			.normalize('NFD')
			.replace(/[\\u0300-\\u036f]/g, '')
			.toLowerCase();
		return {
			path: location.pathname,
			hasQr: text.includes('qr del paquete') && text.includes('codigo qr'),
			hasDeliveryLink:
				text.includes('ver visita de reparto') || text.includes('estado de reparto')
		};
	})()`,
	true,
);
summary.commercialDeliveredOrderScreenshot = await captureScreenshot(
	client,
	sessionId,
	"commercial-order-detail.png",
);

console.error("[m4-ui] checking client ETA");
summary.clientPath = await loginAs(
	client,
	sessionId,
	"lucy@email.com",
	"lucy123$",
	"/clients",
);
summary.clientEtaCard = await evaluate(
	client,
	sessionId,
	`(() => {
		const text = document.body.innerText
			.normalize('NFD')
			.replace(/[\\u0300-\\u036f]/g, '')
			.toLowerCase();
		return {
			path: location.pathname,
			hasEtaCard: text.includes('reparto de hoy') && text.includes('tu hora aproximada'),
			hasEtaState:
				text.includes('sin reparto hoy') ||
				text.includes('en ruta') ||
				text.includes('sin eta exacta') ||
				text.includes('fuera de franja') ||
				text.includes('pendiente de ruta'),
			hasEtaMessage:
				text.includes('no hay reparto planificado para hoy en tu ficha.') ||
				text.includes('tu pedido está programado para hoy') ||
				text.includes('la ruta del dia sigue ajustandose')
		};
	})()`,
	true,
);
summary.clientEtaScreenshot = await captureScreenshot(
	client,
	sessionId,
	"client-eta.png",
);

console.error("[m4-ui] checking client orders");
await navigate(client, sessionId, `${BASE_URL}/clients/orders`);
summary.clientOrders = await evaluate(
	client,
	sessionId,
	`(() => {
		const text = document.body.innerText
			.normalize('NFD')
			.replace(/[\\u0300-\\u036f]/g, '')
			.toLowerCase();
		return {
			path: location.pathname,
			hasOrdersHistory:
				text.includes('pedidos') &&
				(text.includes('entregado') ||
					text.includes('confirmado') ||
					text.includes('cancelado'))
		};
	})()`,
	true,
);
summary.clientOrdersScreenshot = await captureScreenshot(
	client,
	sessionId,
	"client-orders.png",
);

console.error("[m4-ui] checking admin order detail");
summary.adminPath = await loginAs(
	client,
	sessionId,
	"admin@email.com",
	"admin123$",
	"/admin/orders/2ba93afe-01dd-4621-9e1d-5f9b81fcc8f2",
);
summary.adminOrderDetail = await evaluate(
	client,
	sessionId,
	`(() => {
		const text = document.body.innerText
			.normalize('NFD')
			.replace(/[\\u0300-\\u036f]/g, '')
			.toLowerCase();
		return {
			path: location.pathname,
			hasOrderStatus:
				text.includes('entregado') ||
				text.includes('confirmado') ||
				text.includes('cancelado'),
			hasPaymentAndVisit:
				text.includes('cobrado') || text.includes('pendiente'),
			hasQr: text.includes('qr del paquete') && text.includes('codigo qr')
		};
	})()`,
	true,
);

if (!summary.adminOrderDetail.hasQr) {
	await delay(3500);
	await navigate(
		client,
		sessionId,
		`${BASE_URL}/admin/orders/2ba93afe-01dd-4621-9e1d-5f9b81fcc8f2`,
	);
	summary.adminOrderDetail = await evaluate(
		client,
		sessionId,
		`(() => {
			const text = document.body.innerText
				.normalize('NFD')
				.replace(/[\\u0300-\\u036f]/g, '')
				.toLowerCase();
			return {
				path: location.pathname,
				hasOrderStatus:
					text.includes('entregado') ||
					text.includes('confirmado') ||
					text.includes('cancelado'),
				hasPaymentAndVisit:
					text.includes('cobrado') || text.includes('pendiente'),
				hasQr: text.includes('qr del paquete') && text.includes('codigo qr')
			};
		})()`,
		true,
	);
}

summary.adminOrderDetailScreenshot = await captureScreenshot(
	client,
	sessionId,
	"admin-order-detail.png",
);

console.error("[m4-ui] checking auth redirect without session");
await client.call(
	"Storage.clearDataForOrigin",
	{
		origin: BASE_URL,
		storageTypes:
			"cookies,local_storage,session_storage,service_workers,indexeddb,websql,cache_storage",
	},
	sessionId,
);
await navigate(client, sessionId, `${BASE_URL}/commercials/orders`);
summary.authRedirect = await evaluate(
	client,
	sessionId,
	`(() => {
		const text = document.body.innerText
			.normalize('NFD')
			.replace(/[\\u0300-\\u036f]/g, '')
			.toLowerCase();
		return {
			path: location.pathname,
			redirectedToLogin:
				location.pathname === '/login' &&
				text.includes('iniciar sesión')
		};
	})()`,
	true,
);
summary.diagnostics = {
	consoleErrors: diagnostics.consoleErrors.filter(Boolean),
	runtimeExceptions: diagnostics.runtimeExceptions.filter(Boolean),
	networkFailures: diagnostics.networkFailures.filter(Boolean),
	httpErrors: diagnostics.httpErrors.filter(
		issue =>
			!issue.includes("/api/auth/session") &&
			!issue.includes("/api/commercial/visits/00000000-0000-0000-0000-000000000000"),
	),
	apiRequestCounts: diagnostics.apiRequestCounts,
};
summary.sessionHealth = {
	noConsoleErrors: summary.diagnostics.consoleErrors.length === 0,
	noRuntimeExceptions: summary.diagnostics.runtimeExceptions.length === 0,
	noNetworkFailures: summary.diagnostics.networkFailures.length === 0,
	noUnexpectedHttpErrors: summary.diagnostics.httpErrors.length === 0,
	noSuspiciousApiBurst: Object.entries(diagnostics.apiRequestCounts).every(
		([pathname, count]) =>
			pathname.startsWith("/api/auth/") || pathname.startsWith("/api/profile")
				? count <= 8
				: count <= 6,
	),
};

console.log(JSON.stringify(summary, null, 2));
detachDiagnostics();
await client.close();
