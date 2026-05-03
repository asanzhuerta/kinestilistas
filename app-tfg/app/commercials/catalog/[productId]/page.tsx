import { notFound } from "next/navigation";
import CatalogProductDetail from "@/app/components/catalog/CatalogProductDetail";
import { getActiveCatalogProductDetail } from "@/lib/typeorm/services/catalog/catalog-reader";

export default async function CommercialCatalogProductPage({
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
			subtitle="Consulta comercial completa de la referencia seleccionada"
			backHref="/commercials/catalog"
			colorationBasePath="/commercials/coloration"
			showPrice={false}
			product={detail.product}
			supportResources={detail.supportResources}
			relatedColorCharts={detail.relatedColorCharts}
		/>
	);
}
