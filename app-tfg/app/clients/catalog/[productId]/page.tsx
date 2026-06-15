import { notFound } from "next/navigation";
import CatalogProductDetail from "@/app/components/catalog/CatalogProductDetail";
import { requireClientSession } from "@/lib/auth/require-session";
import { getActiveCatalogProductDetail } from "@/lib/typeorm/services/catalog/catalog-reader";

export default async function ClientCatalogProductPage({
	params,
}: {
	params: Promise<{ productId: string }>;
}) {
	const { productId } = await params;
	const [, detail] = await Promise.all([
		requireClientSession(),
		getActiveCatalogProductDetail(productId),
	]);

	if (!detail) {
		notFound();
	}

	return (
		<CatalogProductDetail
			title="Ficha de producto"
			subtitle="Detalle técnico y comercial de la referencia"
			backHref="/clients/catalog"
			colorationBasePath="/clients/coloration"
			showPrice={false}
			product={detail.product}
			supportResources={detail.supportResources}
			relatedColorCharts={detail.relatedColorCharts}
			orderableColorReferences={detail.orderableColorReferences}
			orderContext={{
				mode: "client",
				draftApiBasePath: "/api/clients/orders",
			}}
		/>
	);
}
