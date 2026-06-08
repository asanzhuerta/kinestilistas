import type { NotificationDeliveryChannel } from "@/lib/contracts/communications";

export type AutomaticNotificationKey =
	| "commercial_visit_created"
	| "commercial_visit_rescheduled"
	| "commercial_visit_today"
	| "commercial_visit_auto_postponed";

export type ExternalNotificationDeliveryChannel = Exclude<
	NotificationDeliveryChannel,
	"in_app"
>;

export type NotificationDeliverySettingsItem = {
	key: AutomaticNotificationKey;
	title: string;
	description: string;
	audience: string;
	channels: ExternalNotificationDeliveryChannel[];
	defaultChannels: ExternalNotificationDeliveryChannel[];
	isDefault: boolean;
};

export type UpdateNotificationDeliverySettingsBody = {
	events?: Array<{
		key?: string;
		channels?: string[];
	}>;
};
