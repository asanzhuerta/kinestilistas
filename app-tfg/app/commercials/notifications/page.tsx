import NotificationsWorkspace from "@/app/components/communications/NotificationsWorkspace";
import {
	serializeNotification,
	serializeReminder,
} from "@/app/components/communications/communication-serializers";
import { requireCommercialSession } from "@/lib/auth/require-session";
import {
	listNotificationsForUser,
	listRemindersForUser,
} from "@/lib/typeorm/services/communications/communications";

export default async function CommercialNotificationsPage() {
	const session = await requireCommercialSession();
	const [notifications, reminders] = await Promise.all([
		listNotificationsForUser(session.user.id),
		listRemindersForUser(session.user.id),
	]);

	return (
		<NotificationsWorkspace
			title="Avisos"
			subtitle="Notificaciones y recordatorios comerciales"
			backHref="/commercials"
			initialNotifications={notifications.map(serializeNotification)}
			initialReminders={reminders.map(serializeReminder)}
		/>
	);
}
