import H1Title from "@/app/components/H1Title";
import ColorChartHierarchyWorkspace from "@/app/components/catalog-admin/ColorChartHierarchyWorkspace";
import { getSingleSearchParamValue } from "@/app/components/catalog-admin/catalog-navigation";
import { listColorCharts } from "@/lib/typeorm/services/catalog/color-chart";

type Props = {
	searchParams?: Promise<{
		expandedLineId?: string | string[];
	}>;
};

function serializeColorChart(
	colorChart: Awaited<ReturnType<typeof listColorCharts>>[number],
) {
	return {
		id: colorChart.id,
		name: colorChart.name,
		description: colorChart.description,
		image_url: colorChart.image_url,
		product_line_id: colorChart.product_line_id,
		productLine: colorChart.productLine
			? {
					id: colorChart.productLine.id,
					name: colorChart.productLine.name,
					description: colorChart.productLine.description,
					product_category_id: colorChart.productLine.product_category_id,
					image_url: colorChart.productLine.image_url,
					display_order: colorChart.productLine.display_order,
					productCategory: colorChart.productLine.productCategory
						? {
								id: colorChart.productLine.productCategory.id,
								name: colorChart.productLine.productCategory.name,
								description: colorChart.productLine.productCategory.description,
								display_order:
									colorChart.productLine.productCategory.display_order,
						  }
						: null,
			  }
			: null,
	};
}

export default async function AdminColorChartsPage({ searchParams }: Props) {
	const [resolvedSearchParams, colorCharts] = await Promise.all([
		searchParams ??
			Promise.resolve<{
				expandedLineId?: string | string[];
			}>({}),
		listColorCharts(),
	]);

	return (
		<div className="space-y-6">
			<H1Title
				title="Cartas de color"
				subtitle="Agrupa las cartas cromaticas por linea comercial y navega sus referencias filtradas"
			/>

			<ColorChartHierarchyWorkspace
				colorCharts={colorCharts.map(serializeColorChart)}
				initialExpandedLineId={getSingleSearchParamValue(
					resolvedSearchParams.expandedLineId,
				)}
			/>
		</div>
	);
}
