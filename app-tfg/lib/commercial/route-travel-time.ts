import type { RoutePoint } from "@/lib/contracts/commercial-route";

type OsrmRouteDurationResponse = {
	routes?: Array<{
		legs?: Array<{
			duration?: number | null;
		}>;
	}>;
};

const DEFAULT_OSRM_BASE_URL = "https://router.project-osrm.org";
const ROUTE_DURATION_TIMEOUT_MS = 3500;

export function buildRouteTravelPoints(
	startPoint: RoutePoint | null,
	waypoints: RoutePoint[],
	endPoint: RoutePoint | null = null,
) {
	return [
		...(startPoint ? [startPoint] : []),
		...waypoints,
		...(endPoint ? [endPoint] : []),
	];
}

function getOsrmBaseUrl() {
	return (
		process.env.OSRM_BASE_URL ||
		process.env.NEXT_PUBLIC_OSRM_BASE_URL ||
		DEFAULT_OSRM_BASE_URL
	).replace(/\/+$/, "");
}

function buildRouteDurationUrl(points: RoutePoint[]) {
	const coordinates = points.map((point) => `${point.lng},${point.lat}`).join(";");
	const params = new URLSearchParams({
		overview: "false",
		steps: "false",
	});

	return `${getOsrmBaseUrl()}/route/v1/driving/${coordinates}?${params.toString()}`;
}

function durationSecondsToMinutes(durationSeconds: number) {
	if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
		return null;
	}

	if (durationSeconds === 0) {
		return 0;
	}

	return Math.max(1, Math.round(durationSeconds / 60));
}

export async function loadRouteLegTravelMinutes(points: RoutePoint[]) {
	if (points.length < 2) {
		return [] as number[];
	}

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), ROUTE_DURATION_TIMEOUT_MS);

	try {
		const response = await fetch(buildRouteDurationUrl(points), {
			cache: "no-store",
			signal: controller.signal,
		});

		if (!response.ok) {
			return null;
		}

		const data = (await response.json()) as OsrmRouteDurationResponse;
		const legs = data.routes?.[0]?.legs;

		if (!legs || legs.length !== points.length - 1) {
			return null;
		}

		const minutes = legs.map((leg) =>
			typeof leg.duration === "number"
				? durationSecondsToMinutes(leg.duration)
				: null,
		);

		return minutes.every((value): value is number => value !== null)
			? minutes
			: null;
	} catch {
		return null;
	} finally {
		clearTimeout(timeout);
	}
}
