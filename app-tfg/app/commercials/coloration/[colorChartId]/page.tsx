import { notFound } from "next/navigation";
import ColorChartDetail from "@/app/components/catalog/ColorChartDetail";
import {
	serializeColorChartDetail,
	toClientPlain,
} from "@/app/components/catalog/coloration-serializers";
import { getCatalogColorChartDetail } from "@/lib/typeorm/services/catalog/catalog-reader";

export default async function CommercialColorChartDetailPage({
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
			subtitle="Busqueda rapida de tonos y referencias comerciales"
			backHref="/commercials/coloration"
			colorChart={toClientPlain(serializeColorChartDetail(colorChart))}
		/>
	);
}
