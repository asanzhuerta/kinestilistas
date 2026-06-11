import { createHash } from "crypto";
import { getDataSource } from "@/lib/typeorm/data-source";
import {
	buildCommercialDailyRoutePlan,
	type CommercialDailyRoutePlan,
	type RoutePlanningCommercial,
	type RoutePlanningVisit,
} from "@/lib/commercial/daily-route-planning";
import type { RoutePoint } from "@/lib/contracts/commercial-route";
import { CommercialRoute } from "@/lib/typeorm/entities/CommercialRoute";
import { RouteVisit } from "@/lib/typeorm/entities/RouteVisit";
import { COMMERCIAL_ROUTE_STATUS_IDS } from "@/lib/typeorm/constants/catalog-ids";

// --------------------------------------------------------------------------
// Tipos de datos
// --------------------------------------------------------------------------
type CreateRouteInput = {
	commercialId: string;
	date: string;
	name: string;
};

type AddVisitToRouteInput = {
	routeId: string;
	visitId: string;
	order: number;
};

type PersistedRouteCommercial = RoutePlanningCommercial & {
	id: string;
};

type GetDailyRoutePlanInput = {
	commercial: PersistedRouteCommercial;
	routeDate: string;
	visits: RoutePlanningVisit[];
	startPoint: RoutePoint | null;
};

type PlanningSignaturePoint = {
	id: string;
	lat: number;
	lng: number;
};

type PlanningSignatureVisit = {
	id: string;
	clientId: string | null;
	visitTypeId: number | null;
	lat: number | null;
	lng: number | null;
	visitWindowStartTime: string | null;
	visitWindowEndTime: string | null;
};

function normalizeCoordinateForSignature(value: unknown) {
	const parsed = Number(value);

	if (!Number.isFinite(parsed)) {
		return null;
	}

	return Math.round(parsed * 1000000) / 1000000;
}

function normalizeTimeForSignature(value: string | null | undefined) {
	return value ? value.slice(0, 5) : null;
}

function normalizePointForSignature(
	point: RoutePoint | null,
): PlanningSignaturePoint | null {
	if (!point) {
		return null;
	}

	return {
		id: point.id,
		lat: normalizeCoordinateForSignature(point.lat) ?? point.lat,
		lng: normalizeCoordinateForSignature(point.lng) ?? point.lng,
	};
}

function normalizeVisitForSignature(
	visit: RoutePlanningVisit,
): PlanningSignatureVisit {
	return {
		id: visit.id,
		clientId: visit.client?.id ?? null,
		visitTypeId: visit.visit_type_id ?? null,
		lat: normalizeCoordinateForSignature(visit.client?.lat),
		lng: normalizeCoordinateForSignature(visit.client?.lng),
		visitWindowStartTime: normalizeTimeForSignature(
			visit.client?.visit_window_start_time,
		),
		visitWindowEndTime: normalizeTimeForSignature(
			visit.client?.visit_window_end_time,
		),
	};
}

function buildPlanningSignature(input: GetDailyRoutePlanInput) {
	const payload = {
		routeDate: input.routeDate,
		commercial: {
			id: input.commercial.id,
			workdayStartTime: normalizeTimeForSignature(
				input.commercial.workday_start_time,
			),
			workdayEndTime: normalizeTimeForSignature(
				input.commercial.workday_end_time,
			),
			deliveryVisitDurationMinutes:
				input.commercial.delivery_visit_duration_minutes,
			routineVisitDurationMinutes:
				input.commercial.routine_visit_duration_minutes,
		},
		startPoint: normalizePointForSignature(input.startPoint),
		visits: input.visits
			.map(normalizeVisitForSignature)
			.sort((left, right) => left.id.localeCompare(right.id)),
	};

	return createHash("sha256")
		.update(JSON.stringify(payload))
		.digest("hex");
}

function isPersistedRoutePlan(
	value: CommercialRoute["route_plan"],
): value is CommercialDailyRoutePlan {
	return Boolean(
		value &&
			typeof value === "object" &&
			Array.isArray(value.waypoints) &&
			value.timingSummary &&
			typeof value.timingSummary === "object",
	);
}

function getPlannedStartTime(commercial: RoutePlanningCommercial) {
	return normalizeTimeForSignature(commercial.workday_start_time);
}

function buildRouteVisitRows(input: {
	routeId: string;
	visits: RoutePlanningVisit[];
	routePlan: CommercialDailyRoutePlan;
}) {
	const sequenceByClientId = new Map(
		input.routePlan.waypoints
			.filter((point) => typeof point.sequence === "number")
			.map((point) => [point.id, point.sequence as number]),
	);
	const offsetBySequence = new Map<number, number>();

	return input.visits
		.map((visit) => {
			const sequence = visit.client?.id
				? sequenceByClientId.get(visit.client.id)
				: undefined;

			return {
				visit,
				sequence,
			};
		})
		.filter(
			(
				item,
			): item is {
				visit: RoutePlanningVisit;
				sequence: number;
			} => typeof item.sequence === "number",
		)
		.sort(
			(left, right) =>
				left.sequence - right.sequence || left.visit.id.localeCompare(right.visit.id),
		)
		.map(({ visit, sequence }) => {
			const nextOffset = (offsetBySequence.get(sequence) ?? 0) + 1;
			offsetBySequence.set(sequence, nextOffset);

			return {
				route_id: input.routeId,
				visit_id: visit.id,
				visit_order: sequence * 100 + nextOffset,
			};
		});
}

// --------------------------------------------------------------------------
// SERVICIOS
// --------------------------------------------------------------------------

// Crear ruta comercial
export async function createCommercialRoute(input: CreateRouteInput) {
	const ds = await getDataSource();

	return ds.transaction(async (manager) => {
		const repo = manager.getRepository(CommercialRoute);

		const route = repo.create({
			commercial_id: input.commercialId,
			route_date: input.date,
			name: input.name,
			status_id: COMMERCIAL_ROUTE_STATUS_IDS.PLANNED,
		});

		return repo.save(route);
	});
}

// Añadir visita a ruta
export async function addVisitToRoute(input: AddVisitToRouteInput) {
	const ds = await getDataSource();

	return ds.transaction(async (manager) => {
		const repo = manager.getRepository(RouteVisit);

		const routeVisit = repo.create({
			route_id: input.routeId,
			visit_id: input.visitId,
			visit_order: input.order,
		});

		return repo.save(routeVisit);
	});
}

export async function getOrCreateDailyRoutePlanForCommercial(
	input: GetDailyRoutePlanInput,
) {
	const ds = await getDataSource();
	const planningSignature = buildPlanningSignature(input);

	return ds.transaction(async (manager) => {
		const routeRepo = manager.getRepository(CommercialRoute);
		const routeVisitRepo = manager.getRepository(RouteVisit);
		let route = await routeRepo
			.createQueryBuilder("route")
			.where("route.commercial_id = :commercialId", {
				commercialId: input.commercial.id,
			})
			.andWhere("route.route_date = :routeDate", {
				routeDate: input.routeDate,
			})
			.orderBy("route.created_at", "DESC")
			.getOne();

		if (
			route?.planning_signature === planningSignature &&
			isPersistedRoutePlan(route.route_plan)
		) {
			return route.route_plan;
		}

		const routePlan = buildCommercialDailyRoutePlan({
			commercial: input.commercial,
			visits: input.visits,
			startPoint: input.startPoint,
		});

		if (!route) {
			route = routeRepo.create({
				commercial_id: input.commercial.id,
				route_date: input.routeDate,
				name: `Ruta ${input.routeDate}`,
				status_id: COMMERCIAL_ROUTE_STATUS_IDS.PLANNED,
			});
		}

		route.planning_signature = planningSignature;
		route.planned_start_time = getPlannedStartTime(input.commercial);
		route.route_plan = routePlan;
		route.planned_at = new Date();

		const savedRoute = await routeRepo.save(route);

		await routeVisitRepo.delete({ route_id: savedRoute.id });

		const routeVisitRows = buildRouteVisitRows({
			routeId: savedRoute.id,
			visits: input.visits,
			routePlan,
		});

		if (routeVisitRows.length > 0) {
			await routeVisitRepo.save(routeVisitRows);
		}

		return routePlan;
	});
}
