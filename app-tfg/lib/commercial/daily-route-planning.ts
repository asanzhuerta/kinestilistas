import { COMMERCIAL_VISIT_TYPE_IDS } from "@/lib/typeorm/constants/catalog-ids";
import type {
	CommercialRouteTimingSummary,
	RoutePoint,
} from "@/lib/contracts/commercial-route";
import { MADRID_TIME_ZONE, parseTimeToMinutes } from "@/lib/utils/time";

const APPROX_TRAVEL_SPEED_KMH = 28;

export type RoutePlanningCommercial = {
	workday_start_time: string | null;
	workday_end_time: string | null;
	delivery_visit_duration_minutes: number;
	routine_visit_duration_minutes: number;
};

export type RoutePlanningVisitClient = {
	id: string;
	name: string;
	address?: string | null;
	city?: string | null;
	lat?: unknown;
	lng?: unknown;
	visit_window_start_time?: string | null;
	visit_window_end_time?: string | null;
	user?: {
		email?: string | null;
	} | null;
};

export type RoutePlanningVisit = {
	id: string;
	visit_type_id?: number | null;
	client?: RoutePlanningVisitClient | null;
};

type GroupedClientStop = {
	client: RoutePlanningVisitClient;
	point: RoutePoint | null;
	stopDurationMinutes: number;
	visitCount: number;
	hasDeliveryVisit: boolean;
	hasRoutineVisit: boolean;
};

type MappedClientStop = GroupedClientStop & {
	point: RoutePoint;
};

type MadridClock = {
	date: string;
	timeLabel: string;
	totalMinutes: number;
};

export type CommercialDailyRoutePlan = {
	waypoints: RoutePoint[];
	timingSummary: CommercialRouteTimingSummary;
	totalAssignedClients: number;
	mappedClients: number;
	skippedClients: number;
};

export function parseCoordinate(value: unknown) {
	if (value === null || value === undefined || value === "") {
		return null;
	}

	const parsed = Number(value);

	return Number.isFinite(parsed) ? parsed : null;
}

function formatMinutesAsTimeLabel(value: number) {
	const normalizedMinutes = ((Math.round(value) % 1440) + 1440) % 1440;
	const hours = Math.floor(normalizedMinutes / 60);
	const minutes = normalizedMinutes % 60;

	return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function getMadridDateParts(date: Date) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: MADRID_TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(date);

	return {
		year: parts.find((part) => part.type === "year")?.value ?? "1970",
		month: parts.find((part) => part.type === "month")?.value ?? "01",
		day: parts.find((part) => part.type === "day")?.value ?? "01",
	};
}

function getCurrentMadridClock(date = new Date()): MadridClock {
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone: MADRID_TIME_ZONE,
		hour: "2-digit",
		minute: "2-digit",
		hour12: false,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(date);

	const year = parts.find((part) => part.type === "year")?.value ?? "1970";
	const month = parts.find((part) => part.type === "month")?.value ?? "01";
	const day = parts.find((part) => part.type === "day")?.value ?? "01";
	const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
	const minute = Number(
		parts.find((part) => part.type === "minute")?.value ?? "0",
	);

	return {
		date: `${year}-${month}-${day}`,
		timeLabel: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
		totalMinutes: hour * 60 + minute,
	};
}

export function getTodayRangeInMadrid(date = new Date()) {
	const { year, month, day } = getMadridDateParts(date);
	const today = `${year}-${month}-${day}`;

	return {
		dateFrom: today,
		dateTo: today,
	};
}

function toRadians(value: number) {
	return (value * Math.PI) / 180;
}

function distanceBetween(
	from: { lat: number; lng: number },
	to: { lat: number; lng: number },
) {
	const earthRadiusKm = 6371;
	const dLat = toRadians(to.lat - from.lat);
	const dLng = toRadians(to.lng - from.lng);
	const fromLat = toRadians(from.lat);
	const toLat = toRadians(to.lat);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(fromLat) *
			Math.cos(toLat) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return earthRadiusKm * c;
}

function estimateTravelMinutes(distanceKm: number) {
	if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
		return 0;
	}

	return Math.max(
		3,
		Math.round((distanceKm / APPROX_TRAVEL_SPEED_KMH) * 60),
	);
}

function getVisitDurationMinutes(
	commercial: RoutePlanningCommercial,
	visitTypeId: number | null | undefined,
) {
	if (visitTypeId === COMMERCIAL_VISIT_TYPE_IDS.DELIVERY) {
		return commercial.delivery_visit_duration_minutes;
	}

	if (visitTypeId === COMMERCIAL_VISIT_TYPE_IDS.ROUTINE) {
		return commercial.routine_visit_duration_minutes;
	}

	return 0;
}

function buildClientDescription(client: RoutePlanningVisitClient) {
	if (client.address && client.city) {
		return `${client.address} · ${client.city}`;
	}

	return client.user?.email || "Cliente con visita hoy";
}

function groupVisitsByClient(
	visits: RoutePlanningVisit[],
	commercial: RoutePlanningCommercial,
) {
	const groupedStops = new Map<string, GroupedClientStop>();

	for (const visit of visits) {
		const client = visit.client;

		if (!client) {
			continue;
		}

		const existingStop = groupedStops.get(client.id);

		if (existingStop) {
			existingStop.stopDurationMinutes += getVisitDurationMinutes(
				commercial,
				visit.visit_type_id,
			);
			existingStop.visitCount += 1;
			existingStop.hasDeliveryVisit =
				existingStop.hasDeliveryVisit ||
				visit.visit_type_id === COMMERCIAL_VISIT_TYPE_IDS.DELIVERY;
			existingStop.hasRoutineVisit =
				existingStop.hasRoutineVisit ||
				visit.visit_type_id === COMMERCIAL_VISIT_TYPE_IDS.ROUTINE;
			continue;
		}

		const lat = parseCoordinate(client.lat);
		const lng = parseCoordinate(client.lng);

		groupedStops.set(client.id, {
			client,
			point:
				lat !== null && lng !== null
					? {
							id: client.id,
							label: client.name,
							lat,
							lng,
							description: buildClientDescription(client),
						}
					: null,
			stopDurationMinutes: getVisitDurationMinutes(
				commercial,
				visit.visit_type_id,
			),
			visitCount: 1,
			hasDeliveryVisit:
				visit.visit_type_id === COMMERCIAL_VISIT_TYPE_IDS.DELIVERY,
			hasRoutineVisit:
				visit.visit_type_id === COMMERCIAL_VISIT_TYPE_IDS.ROUTINE,
		});
	}

	return Array.from(groupedStops.values());
}

function sortStopsByNearestNeighbor(
	stops: MappedClientStop[],
	startPoint: RoutePoint | null,
) {
	if (stops.length <= 1) {
		return stops;
	}

	const remaining = [...stops];
	const ordered: MappedClientStop[] = [];
	let current =
		startPoint !== null
			? { lat: startPoint.lat, lng: startPoint.lng }
			: remaining[0].point
				? { lat: remaining[0].point.lat, lng: remaining[0].point.lng }
				: null;

	if (!current) {
		return remaining;
	}

	while (remaining.length > 0) {
		let nearestIndex = 0;
		let nearestDistance = distanceBetween(current, {
			lat: remaining[0].point!.lat,
			lng: remaining[0].point!.lng,
		});

		for (let index = 1; index < remaining.length; index += 1) {
			const stop = remaining[index];
			const candidateDistance = distanceBetween(current, {
				lat: stop.point!.lat,
				lng: stop.point!.lng,
			});

			if (candidateDistance < nearestDistance) {
				nearestDistance = candidateDistance;
				nearestIndex = index;
			}
		}

		const [nextStop] = remaining.splice(nearestIndex, 1);
		ordered.push(nextStop);
		current = {
			lat: nextStop.point!.lat,
			lng: nextStop.point!.lng,
		};
	}

	return ordered;
}

function roundToOneDecimal(value: number) {
	return Math.round(value * 10) / 10;
}

function buildTimingSummary(input: {
	commercial: RoutePlanningCommercial;
	visits: RoutePlanningVisit[];
	now: MadridClock;
	approxTravelMinutes: number;
	totalWaitingMinutes: number;
	pastWindowStopsCount: number;
}) {
	const {
		commercial,
		visits,
		now,
		approxTravelMinutes,
		totalWaitingMinutes,
		pastWindowStopsCount,
	} = input;
	const workdayStartTime = commercial.workday_start_time;
	const workdayEndTime = commercial.workday_end_time;
	const startMinutes = parseTimeToMinutes(workdayStartTime);
	const endMinutes = parseTimeToMinutes(workdayEndTime);
	const hasWorkdayConfig = Boolean(workdayStartTime && workdayEndTime);
	const hasValidWorkdayRange =
		startMinutes !== null && endMinutes !== null && endMinutes > startMinutes;

	let deliveryVisitsCount = 0;
	let routineVisitsCount = 0;
	let totalPlannedVisitMinutes = 0;

	for (const visit of visits) {
		if (visit.visit_type_id === COMMERCIAL_VISIT_TYPE_IDS.DELIVERY) {
			deliveryVisitsCount += 1;
		}

		if (visit.visit_type_id === COMMERCIAL_VISIT_TYPE_IDS.ROUTINE) {
			routineVisitsCount += 1;
		}

		totalPlannedVisitMinutes += getVisitDurationMinutes(
			commercial,
			visit.visit_type_id,
		);
	}

	const totalCommittedRouteMinutes =
		totalPlannedVisitMinutes + approxTravelMinutes + totalWaitingMinutes;

	const totalWorkdayMinutes = hasValidWorkdayRange
		? endMinutes! - startMinutes!
		: null;
	const elapsedWorkdayMinutes =
		totalWorkdayMinutes === null
			? null
			: Math.min(Math.max(now.totalMinutes - startMinutes!, 0), totalWorkdayMinutes);
	const remainingWorkdayMinutes =
		totalWorkdayMinutes === null
			? null
			: Math.max(endMinutes! - Math.max(now.totalMinutes, startMinutes!), 0);
	const remainingOperationalMarginMinutes =
		remainingWorkdayMinutes === null
			? null
			: Math.max(remainingWorkdayMinutes - totalCommittedRouteMinutes, 0);
	const overbookedMinutes =
		remainingWorkdayMinutes === null
			? null
			: Math.max(totalCommittedRouteMinutes - remainingWorkdayMinutes, 0);

	const summary: CommercialRouteTimingSummary = {
		hasWorkdayConfig,
		hasValidWorkdayRange,
		workdayStartTime,
		workdayEndTime,
		currentTimeLabel: now.timeLabel,
		totalWorkdayMinutes,
		elapsedWorkdayMinutes,
		remainingWorkdayMinutes,
		plannedVisitsCount: visits.length,
		deliveryVisitsCount,
		routineVisitsCount,
		totalPlannedVisitMinutes,
		approxTravelMinutes,
		totalWaitingMinutes,
		totalCommittedRouteMinutes,
		remainingOperationalMarginMinutes,
		overbookedMinutes,
		pastWindowStopsCount,
	};

	return summary;
}

export function buildCommercialDailyRoutePlan(input: {
	commercial: RoutePlanningCommercial;
	visits: RoutePlanningVisit[];
	startPoint: RoutePoint | null;
	date?: Date;
}) {
	const now = getCurrentMadridClock(input.date);
	const groupedStops = groupVisitsByClient(input.visits, input.commercial);
	const mappedStops = groupedStops.filter(
		(stop): stop is MappedClientStop => stop.point !== null,
	);
	const orderedStops = sortStopsByNearestNeighbor(mappedStops, input.startPoint);

	const plannedStartMinutes = (() => {
		const configuredStartMinutes = parseTimeToMinutes(
			input.commercial.workday_start_time,
		);

		if (configuredStartMinutes === null) {
			return now.totalMinutes;
		}

		return Math.max(now.totalMinutes, configuredStartMinutes);
	})();

	let totalTravelMinutes = 0;
	let totalWaitingMinutes = 0;
	let pastWindowStopsCount = 0;
	let currentMinutes = plannedStartMinutes;
	let previousPoint = input.startPoint;

	const waypoints: RoutePoint[] = orderedStops.map((stop, index) => {
		let approxDistanceKmFromPrevious = 0;
		let approxTravelMinutesFromPrevious = 0;

		if (previousPoint) {
			const fromPoint = previousPoint;
			approxDistanceKmFromPrevious = distanceBetween(fromPoint, stop.point);
			approxTravelMinutesFromPrevious = estimateTravelMinutes(
				approxDistanceKmFromPrevious,
			);
			totalTravelMinutes += approxTravelMinutesFromPrevious;
			currentMinutes += approxTravelMinutesFromPrevious;
		}

		const visitWindowStartMinutes = parseTimeToMinutes(
			stop.client.visit_window_start_time,
		);
		const visitWindowEndMinutes = parseTimeToMinutes(
			stop.client.visit_window_end_time,
		);

		const waitMinutesBeforeVisit =
			visitWindowStartMinutes !== null && currentMinutes < visitWindowStartMinutes
				? visitWindowStartMinutes - currentMinutes
				: 0;

		totalWaitingMinutes += waitMinutesBeforeVisit;
		currentMinutes += waitMinutesBeforeVisit;

		const estimatedArrivalMinutes = currentMinutes;
		const estimatedDepartureMinutes =
			estimatedArrivalMinutes + stop.stopDurationMinutes;
		const isPastVisitWindow =
			visitWindowEndMinutes !== null &&
			estimatedArrivalMinutes > visitWindowEndMinutes;

		if (isPastVisitWindow) {
			pastWindowStopsCount += 1;
		}

		currentMinutes = estimatedDepartureMinutes;
		previousPoint = stop.point;

		return {
			...stop.point,
			sequence: index + 1,
			estimatedArrivalTime: formatMinutesAsTimeLabel(estimatedArrivalMinutes),
			estimatedDepartureTime: formatMinutesAsTimeLabel(estimatedDepartureMinutes),
			approxDistanceKmFromPrevious: roundToOneDecimal(
				approxDistanceKmFromPrevious,
			),
			approxTravelMinutesFromPrevious,
			waitMinutesBeforeVisit,
			stopDurationMinutes: stop.stopDurationMinutes,
			visitWindowStartTime: stop.client.visit_window_start_time ?? null,
			visitWindowEndTime: stop.client.visit_window_end_time ?? null,
			hasDeliveryVisit: stop.hasDeliveryVisit,
			hasRoutineVisit: stop.hasRoutineVisit,
			visitCount: stop.visitCount,
			isPastVisitWindow,
		};
	});

	const timingSummary = buildTimingSummary({
		commercial: input.commercial,
		visits: input.visits,
		now,
		approxTravelMinutes: totalTravelMinutes,
		totalWaitingMinutes,
		pastWindowStopsCount,
	});

	const result: CommercialDailyRoutePlan = {
		waypoints,
		timingSummary,
		totalAssignedClients: groupedStops.length,
		mappedClients: waypoints.length,
		skippedClients: groupedStops.length - waypoints.length,
	};

	return result;
}
