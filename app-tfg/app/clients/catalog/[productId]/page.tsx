import { notFound } from "next/navigation";
import CatalogProductDetail from "@/app/components/catalog/CatalogProductDetail";
import { getActiveCatalogProductDetail } from "@/lib/typeorm/services/catalog/catalog-reader";

export default async function ClientCatalogProductPage({
	params,
}: {
	params: Promise<{ productId: string }>;
}) {
	const { productId } = await params;
	const detail = await getActiveCatalogProductDetail(productId);

	if (!detail) {
		notFound();
	}

	return (
		<CatalogProductDetail
			title="Ficha de producto"
			subtitle="Detalle tecnico y comercial de la referencia"
			backHref="/clients/catalog"
			colorationBasePath="/clients/coloration"
			product={detail.product}
			supportResources={detail.supportResources}
			relatedColorCharts={detail.relatedColorCharts}
		/>
	);
}
