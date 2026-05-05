import ColorChartsExplorer from "@/app/components/catalog/ColorChartsExplorer";
import {
	serializeColorChartListItem,
	serializeColorReferenceListItem,
	toClientPlain,
} from "@/app/components/catalog/coloration-serializers";
import { listCatalogColorChartsWithReferences } from "@/lib/typeorm/services/catalog/catalog-reader";

export default async function ClientColorationPage() {
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
			title="Coloracion"
			subtitle="Consulta gamas, cartas y tonos disponibles en el catalogo"
			colorCharts={serializedColorCharts}
			colorReferences={serializedColorReferences}
			detailBasePath="/clients/coloration"
		/>
	);
}
