import PromotionsOverview from "@/app/components/communications/PromotionsOverview";
import { serializePromotion } from "@/app/components/communications/communication-serializers";
import { requireClientSession } from "@/lib/auth/require-session";
import { listPromotionsForUser } from "@/lib/typeorm/services/communications/communications";

export default async function ClientPromotionsPage() {
	const session = await requireClientSession();
	const promotions = await listPromotionsForUser({
		userId: session.user.id,
		role: "client",
	});

	return (
		<PromotionsOverview
			title="Promociones"
			subtitle="Campañas activas para tu salón"
			backHref="/clients"
			promotions={promotions.map(serializePromotion)}
			showIntro={false}
		/>
	);
}
