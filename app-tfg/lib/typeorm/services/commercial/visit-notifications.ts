import { EntityManager, IsNull } from "typeorm";
import { getDataSource } from "@/lib/typeorm/data-source";
import {
	COMMERCIAL_VISIT_STATUS_IDS,
	COMMERCIAL_VISIT_TYPE_IDS,
	ROLE_IDS,
	USER_STATUS_IDS,
} from "@/lib/typeorm/constants/catalog-ids";
import { AppNotification } from "@/lib/typeorm/entities/AppNotification";
import { CommercialVisit } from "@/lib/typeorm/entities/CommercialVisit";
import { User } from "@/lib/typeorm/entities/User";
import type { NotificationDeliveryChannel } from "@/lib/contracts/communications";
import { deliverNotificationToExternalChannels } from "@/lib/typeorm/services/communications/notification-delivery";
import {
	getAutomaticNotificationDeliveryChannels,
	hasExternalNotificationChannels,
} from "@/lib/typeorm/services/communications/notification-settings";

type VisitNotificationInput = {
	recipientUserId: string;
	title: string;
	body: string;
	notificationType: string;
	sourceType: string;
	sourceId: string | null;
	deliverExternal?: boolean;
	deliveryChannels?: NotificationDeliveryChannel[];
};

function formatVisitDate(value: string) {
	const parsed = new Date(`${value}T00:00:00`);

	if (Number.isNaN(parsed.getTime())) {
		return value;
	}

	return new Intl.DateTimeFormat("es-ES", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(parsed);
}

function getVisitTypeLabel(visitTypeId: number) {
	if (visitTypeId === COMMERCIAL_VISIT_TYPE_IDS.DELIVERY) {
		return "entrega";
	}

	return "visita comercial";
}

function getMadridTodayDate(date = new Date()) {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Europe/Madrid",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(date);

	const year = parts.find((part) => part.type === "year")?.value ?? "1970";
	const month = parts.find((part) => part.type === "month")?.value ?? "01";
	const day = parts.find((part) => part.type === "day")?.value ?? "01";

	return `${year}-${month}-${day}`;
}

async function getVisitNotificationDeliveryOptions(
	manager: EntityManager,
	key:
		| "commercial_visit_created"
		| "commercial_visit_rescheduled"
		| "commercial_visit_today"
		| "commercial_visit_auto_postponed",
) {
	const channels = await getAutomaticNotificationDeliveryChannels(key, manager);

	return {
		deliverExternal: hasExternalNotificationChannels(channels),
		deliveryChannels: channels,
	};
}

async function createNotificationIfMissing(
	manager: EntityManager,
	input: VisitNotificationInput,
) {
	const repo = manager.getRepository(AppNotification);
	const existing = await repo.findOne({
		where: {
			recipient_user_id: input.recipientUserId,
			notification_type: input.notificationType,
			source_type: input.sourceType,
			source_id: input.sourceId ?? IsNull(),
		},
	});

	if (existing) {
		return existing;
	}

	const notification = await repo.save(
		repo.create({
			recipient_user_id: input.recipientUserId,
			title: input.title,
			body: input.body,
			notification_type: input.notificationType,
			channel: "in_app",
			source_type: input.sourceType,
			source_id: input.sourceId,
		}),
	);

	if (input.deliverExternal) {
		const recipient = await manager.getRepository(User).findOne({
			where: {
				id: input.recipientUserId,
				status_id: USER_STATUS_IDS.ACTIVE,
			},
		});

		if (recipient) {
			await deliverNotificationToExternalChannels(manager, {
				recipients: [recipient],
				channels: input.deliveryChannels ?? ["email", "push"],
				title: input.title,
				body: input.body,
				notificationType: input.notificationType,
				sourceType: input.sourceType,
				sourceId: String(input.sourceId),
			});
		}
	}

	return notification;
}

export async function notifyClientVisitCreated(
	manager: EntityManager,
	visit: CommercialVisit,
) {
	await createNotificationIfMissing(manager, {
		recipientUserId: visit.client_id,
		title: "Nueva visita programada",
		body: `Se ha programado una ${getVisitTypeLabel(
			visit.visit_type_id,
		)} para el ${formatVisitDate(visit.scheduled_for_date)}.`,
		notificationType: "visit_created",
		sourceType: "commercial_visit_created",
		sourceId: visit.id,
		...(await getVisitNotificationDeliveryOptions(
			manager,
			"commercial_visit_created",
		)),
	});
}

export async function notifyClientVisitRescheduled(
	manager: EntityManager,
	visit: CommercialVisit,
) {
	await createNotificationIfMissing(manager, {
		recipientUserId: visit.client_id,
		title: "Visita reubicada",
		body: `Tu ${getVisitTypeLabel(
			visit.visit_type_id,
		)} se ha reubicado para el ${formatVisitDate(visit.scheduled_for_date)}.`,
		notificationType: `visit_rescheduled:${visit.scheduled_for_date}`,
		sourceType: "commercial_visit_rescheduled",
		sourceId: visit.id,
		...(await getVisitNotificationDeliveryOptions(
			manager,
			"commercial_visit_rescheduled",
		)),
	});
}

export async function notifyCommercialVisitsAutoPostponed(
	manager: EntityManager,
	input: {
		commercialUserId: string;
		visits: CommercialVisit[];
	},
) {
	if (!input.visits.length) {
		return;
	}

	const count = input.visits.length;
	const firstVisit = input.visits[0];
	const clientNames = input.visits
		.slice(0, 3)
		.map((visit) => visit.client?.name ?? "cliente")
		.join(", ");
	const extraCount = Math.max(count - 3, 0);
	const suffix = extraCount > 0 ? ` y ${extraCount} mas` : "";

	await createNotificationIfMissing(manager, {
		recipientUserId: input.commercialUserId,
		title:
			count === 1
				? "Visita aplazada automáticamente"
				: `${count} visitas aplazadas automáticamente`,
		body:
			count === 1
				? `La visita de ${firstVisit.client?.name ?? "un cliente"} del ${formatVisitDate(
						firstVisit.scheduled_for_date,
					)} se ha aplazado por horario. Reubicala desde visitas.`
				: `Se han aplazado por horario visitas de ${clientNames}${suffix}. Reubicalas desde visitas.`,
		notificationType: "visit_auto_postponed",
		sourceType:
			count === 1
				? "commercial_visit_postponed"
				: "commercial_visit_postponed_batch",
		sourceId: count === 1 ? firstVisit.id : null,
		...(await getVisitNotificationDeliveryOptions(
			manager,
			"commercial_visit_auto_postponed",
		)),
	});
}

export async function syncTodayVisitNotificationsForUser(userId: string) {
	const ds = await getDataSource();
	const today = getMadridTodayDate();

	await ds.transaction(async (manager) => {
		const user = await manager.getRepository(User).findOne({
			where: {
				id: userId,
				role_id: ROLE_IDS.CLIENT,
				status_id: USER_STATUS_IDS.ACTIVE,
			},
		});

		if (!user) {
			return;
		}

		const visits = await manager
			.getRepository(CommercialVisit)
			.createQueryBuilder("visit")
			.leftJoinAndSelect("visit.commercial", "commercial")
			.leftJoinAndSelect("commercial.user", "commercialUser")
			.where("visit.client_id = :userId", { userId })
			.andWhere("visit.status_id = :plannedStatusId", {
				plannedStatusId: COMMERCIAL_VISIT_STATUS_IDS.PLANNED,
			})
			.andWhere("visit.scheduled_for_date = :today", { today })
			.getMany();

		for (const visit of visits) {
			const commercialName =
				visit.commercial?.user?.name ?? "tu comercial asignado";

			await createNotificationIfMissing(manager, {
				recipientUserId: userId,
				title: "Hoy tienes una visita pendiente",
				body: `Hoy tienes una ${getVisitTypeLabel(
					visit.visit_type_id,
				)} pendiente con ${commercialName}.`,
				notificationType: `visit_today:${today}`,
				sourceType: "commercial_visit_today",
				sourceId: visit.id,
				...(await getVisitNotificationDeliveryOptions(
					manager,
					"commercial_visit_today",
				)),
			});
		}
	});
}
