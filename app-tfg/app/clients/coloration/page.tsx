import ColorChartsExplorer from "@/app/components/catalog/ColorChartsExplorer";
import { listCatalogColorChartsWithReferences } from "@/lib/typeorm/services/catalog/catalog-reader";

export default async function ClientColorationPage() {
	const { colorCharts, colorReferences } =
		await listCatalogColorChartsWithReferences();

	return (
		<ColorChartsExplorer
			title="Coloracion"
			subtitle="Consulta gamas, cartas y tonos disponibles en el catalogo"
			colorCharts={colorCharts}
			colorReferences={colorReferences}
			detailBasePath="/clients/coloration"
		/>
	);
}
