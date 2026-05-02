import ColorChartsExplorer from "@/app/components/catalog/ColorChartsExplorer";
import { listCatalogColorChartsWithReferences } from "@/lib/typeorm/services/catalog/catalog-reader";

export default async function CommercialColorationPage() {
	const { colorCharts, colorReferences } =
		await listCatalogColorChartsWithReferences();

	return (
		<ColorChartsExplorer
			title="Coloracion"
			subtitle="Explora cartas de color y referencias para asesoramiento tecnico"
			colorCharts={colorCharts}
			colorReferences={colorReferences}
			detailBasePath="/commercials/coloration"
		/>
	);
}
