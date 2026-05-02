import { notFound } from "next/navigation";
import ColorChartDetail from "@/app/components/catalog/ColorChartDetail";
import { getCatalogColorChartDetail } from "@/lib/typeorm/services/catalog/catalog-reader";

export default async function ClientColorChartDetailPage({
	params,
}: {
	params: Promise<{ colorChartId: string }>;
}) {
	const { colorChartId } = await params;
	const colorChart = await getCatalogColorChartDetail(colorChartId);

	if (!colorChart) {
		notFound();
	}

	return (
		<ColorChartDetail
			title="Carta de color"
			subtitle="Localiza tonos y referencias en tu catalogo profesional"
			backHref="/clients/coloration"
			colorChart={colorChart}
		/>
	);
}
