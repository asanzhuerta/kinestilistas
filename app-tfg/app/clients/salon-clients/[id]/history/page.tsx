import { notFound } from "next/navigation";
import { requireClientSession } from "@/lib/auth/require-session";
import SalonClientDetailView from "@/app/components/salon/SalonClientDetailView";
import {
	getSalonClientDetailForClientUser,
	SalonTechnicalServiceError,
} from "@/lib/typeorm/services/salon/salon-client";

type PageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function ClientSalonClientHistoryPage({
	params,
}: PageProps) {
	const [session, { id }] = await Promise.all([requireClientSession(), params]);
	let detail;

	try {
		detail = await getSalonClientDetailForClientUser(session.user.id, id);
	} catch (error) {
		if (error instanceof SalonTechnicalServiceError && error.status === 404) {
			notFound();
		}

		throw error;
	}

	return (
		<SalonClientDetailView
			initialDetail={detail}
			initialTemplates={[]}
			productOptions={[]}
			showOverviewPanels={false}
			showServiceForm={false}
			showHistory
			backHref={`/clients/salon-clients/${id}`}
			backLabel="Volver a la ficha"
			title={`Historial técnico - ${detail.salonClient.name}`}
			subtitle="Consulta, filtra y corrige los servicios técnicos registrados."
		/>
	);
}
