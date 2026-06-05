import H1Title from "@/app/components/H1Title";
import AdminCommunicationsWorkspace from "@/app/components/communications/AdminCommunicationsWorkspace";
import {
	serializeClientOption,
	serializeClientSegmentAssignment,
	serializeProductLineOption,
	serializeProductOption,
	serializePromotion,
	serializeSegment,
	serializeTrainingEvent,
} from "@/app/components/communications/communication-serializers";
import { requireAdminSession } from "@/lib/auth/require-session";
import { listProductLines } from "@/lib/typeorm/services/catalog/product-line";
import { listProducts } from "@/lib/typeorm/services/catalog/product";
import { listClients } from "@/lib/typeorm/services/commercial/client";
import {
	listAdminPromotions,
	listAdminTrainingEvents,
	listClientSegmentAssignments,
	listCustomerSegments,
} from "@/lib/typeorm/services/communications/communications";

export default async function AdminCommunicationsPage() {
	await requireAdminSession();

	const [
		segments,
		assignments,
		clients,
		products,
		productLines,
		promotions,
		trainings,
	] = await Promise.all([
		listCustomerSegments(),
		listClientSegmentAssignments(),
		listClients(),
		listProducts(),
		listProductLines(),
		listAdminPromotions(),
		listAdminTrainingEvents(),
	]);

	return (
		<div className="space-y-6">
			<H1Title
				title="Comunicaciones"
				subtitle="Promociones, formaciones, rangos y avisos internos"
			/>

			<AdminCommunicationsWorkspace
				segments={segments.map(serializeSegment)}
				assignments={assignments.map(serializeClientSegmentAssignment)}
				clients={clients.map(serializeClientOption)}
				products={products.map(serializeProductOption)}
				productLines={productLines.map(serializeProductLineOption)}
				promotions={promotions.map(serializePromotion)}
				trainings={trainings.map(serializeTrainingEvent)}
			/>
		</div>
	);
}
