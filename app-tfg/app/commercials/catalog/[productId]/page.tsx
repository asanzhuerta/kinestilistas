import { notFound } from "next/navigation";
import CatalogProductDetail from "@/app/components/catalog/CatalogProductDetail";
import { requireCommercialSession } from "@/lib/auth/require-session";
import { listClientsByCommercialId } from "@/lib/typeorm/services/commercial/client";
import { requireCommercialByUserId } from "@/lib/typeorm/services/commercial/commercial";
import { getActiveCatalogProductDetail } from "@/lib/typeorm/services/catalog/catalog-reader";

export default async function CommercialCatalogProductPage({
	params,
}: {
	params: Promise<{ productId: string }>;
}) {
	const [session, { productId }] = await Promise.all([
		requireCommercialSession(),
		params,
	]);
	const [detail, clients] = await Promise.all([
		getActiveCatalogProductDetail(productId),
		requireCommercialByUserId(session.user.id).then((commercial) =>
			listClientsByCommercialId(commercial.id),
		),
	]);

	if (!detail) {
		notFound();
	}

	return (
		<CatalogProductDetail
			title="Ficha de producto"
			subtitle="Consulta comercial completa de la referencia seleccionada"
			backHref="/commercials/catalog"
			colorationBasePath="/commercials/coloration"
			showPrice={false}
			product={detail.product}
			supportResources={detail.supportResources}
			relatedColorCharts={detail.relatedColorCharts}
			orderableColorReferences={detail.orderableColorReferences}
			orderContext={{
				mode: "commercial",
				draftApiBasePath: "/api/commercial/orders",
				clientOptions: clients.map((client) => ({
					id: client.id,
					name: client.name,
					contactName: client.contact_name ?? null,
				})),
			}}
		/>
	);
}
