import NotificationsWorkspace from "@/app/components/communications/NotificationsWorkspace";
import {
	serializeNotification,
	serializeReminder,
} from "@/app/components/communications/communication-serializers";
import { requireClientSession } from "@/lib/auth/require-session";
import {
	listNotificationsForUser,
	listRemindersForUser,
} from "@/lib/typeorm/services/communications/communications";

export default async function ClientNotificationsPage() {
	const session = await requireClientSession();
	const [notifications, reminders] = await Promise.all([
		listNotificationsForUser(session.user.id),
		listRemindersForUser(session.user.id),
	]);

	return (
		<NotificationsWorkspace
			title="Avisos"
			subtitle="Notificaciones y recordatorios del salon"
			backHref="/clients"
			initialNotifications={notifications.map(serializeNotification)}
			initialReminders={reminders.map(serializeReminder)}
		/>
	);
}
