import AdminNotificationSettingsForm from "@/app/components/admin/AdminNotificationSettingsForm";
import PageTransition from "@/app/components/animations/PageTransition";
import H1Title from "@/app/components/H1Title";

export default function AdminSettingsPage() {
	return (
		<PageTransition>
			<div className="space-y-6">
				<H1Title
					title="Ajustes globales"
					subtitle="Configura los canales de avisos automáticos disponibles para la aplicación."
				/>

				<AdminNotificationSettingsForm />
			</div>
		</PageTransition>
	);
}
