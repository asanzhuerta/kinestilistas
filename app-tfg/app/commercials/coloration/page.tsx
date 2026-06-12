import ColorChartsExplorer from "@/app/components/catalog/ColorChartsExplorer";
import {
	serializeColorChartListItem,
	serializeColorReferenceListItem,
	toClientPlain,
} from "@/app/components/catalog/coloration-serializers";
import { listCatalogColorChartsWithReferences } from "@/lib/typeorm/services/catalog/catalog-reader";

export default async function CommercialColorationPage() {
	const { colorCharts, colorReferences } =
		await listCatalogColorChartsWithReferences();
	const serializedColorCharts = toClientPlain(
		colorCharts.map(serializeColorChartListItem),
	);
	const serializedColorReferences = toClientPlain(
		colorReferences.map(serializeColorReferenceListItem),
	);

	return (
		<ColorChartsExplorer
			title="Coloración"
			subtitle="Explora cartas de color y referencias para asesoramiento técnico"
			colorCharts={serializedColorCharts}
			colorReferences={serializedColorReferences}
			detailBasePath="/commercials/coloration"
			toneDetailBasePath="/commercials/coloration/tones"
		/>
	);
}
