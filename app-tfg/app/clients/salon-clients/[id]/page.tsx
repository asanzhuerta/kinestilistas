import { notFound } from "next/navigation";
import { requireClientSession } from "@/lib/auth/require-session";
import SalonClientDetailView from "@/app/components/salon/SalonClientDetailView";
import {
	getSalonClientDetailForClientUser,
	listSalonProductOptions,
	SalonTechnicalServiceError,
} from "@/lib/typeorm/services/salon/salon-client";
import { listSalonServiceTemplatesForClientUser } from "@/lib/typeorm/services/salon/salon-service-template";

type PageProps = {
	params: Promise<{
		id: string;
	}>;
};

export default async function ClientSalonClientDetailPage({
	params,
}: PageProps) {
	const [session, { id }] = await Promise.all([requireClientSession(), params]);
	let detail;
	let productOptions;
	let templates;

	try {
		[detail, productOptions, templates] = await Promise.all([
			getSalonClientDetailForClientUser(session.user.id, id),
			listSalonProductOptions(),
			listSalonServiceTemplatesForClientUser(session.user.id),
		]);
	} catch (error) {
		if (error instanceof SalonTechnicalServiceError && error.status === 404) {
			notFound();
		}

		throw error;
	}

	return (
		<SalonClientDetailView
			initialDetail={detail}
			initialTemplates={templates}
			productOptions={productOptions}
			showHistory={false}
			historyHref={`/clients/salon-clients/${id}/history`}
		/>
	);
}
