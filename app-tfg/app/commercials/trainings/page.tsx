import TrainingEventsWorkspace from "@/app/components/communications/TrainingEventsWorkspace";
import { serializeTrainingEvent } from "@/app/components/communications/communication-serializers";
import { requireCommercialSession } from "@/lib/auth/require-session";
import { listTrainingEventsForUser } from "@/lib/typeorm/services/communications/communications";

export default async function CommercialTrainingsPage() {
	const session = await requireCommercialSession();
	const trainings = await listTrainingEventsForUser(session.user.id);

	return (
		<TrainingEventsWorkspace
			title="Formaciones"
			subtitle="Sesiones publicadas para el equipo comercial"
			backHref="/commercials"
			initialTrainings={trainings.map(serializeTrainingEvent)}
			showIntro={false}
		/>
	);
}
