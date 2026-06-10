import TrainingEventsWorkspace from "@/app/components/communications/TrainingEventsWorkspace";
import { serializeTrainingEvent } from "@/app/components/communications/communication-serializers";
import { requireClientSession } from "@/lib/auth/require-session";
import { listTrainingEventsForUser } from "@/lib/typeorm/services/communications/communications";

export default async function ClientTrainingsPage() {
	const session = await requireClientSession();
	const trainings = await listTrainingEventsForUser(session.user.id);

	return (
		<TrainingEventsWorkspace
			title="Formaciones"
			subtitle="Sesiones disponibles para tu salón"
			backHref="/clients"
			initialTrainings={trainings.map(serializeTrainingEvent)}
			showIntro={false}
		/>
	);
}
