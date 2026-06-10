import PromotionsOverview from "@/app/components/communications/PromotionsOverview";
import { serializePromotion } from "@/app/components/communications/communication-serializers";
import { requireCommercialSession } from "@/lib/auth/require-session";
import { listPromotionsForUser } from "@/lib/typeorm/services/communications/communications";

export default async function CommercialPromotionsPage() {
	const session = await requireCommercialSession();
	const promotions = await listPromotionsForUser({
		userId: session.user.id,
		role: "commercial",
	});

	return (
		<PromotionsOverview
			title="Promociones"
			subtitle="Campañas vigentes para seguimiento comercial"
			backHref="/commercials"
			promotions={promotions.map(serializePromotion)}
			showIntro={false}
		/>
	);
}
