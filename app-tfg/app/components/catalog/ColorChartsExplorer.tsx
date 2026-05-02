import H1Title from "@/app/components/H1Title";
import EntityTable from "@/app/components/entity-table/EntityTable";
import { mapColorChartsToEntityTableItems } from "./catalog-table-mappers";
import type { listColorCharts, listColorReferences } from "@/lib/typeorm/services/catalog/color-chart";

type Props = {
	title: string;
	subtitle: string;
	colorCharts: Awaited<ReturnType<typeof listColorCharts>>;
	colorReferences: Awaited<ReturnType<typeof listColorReferences>>;
	detailBasePath: string;
};

export default function ColorChartsExplorer({
	title,
	subtitle,
	colorCharts,
	colorReferences,
	detailBasePath,
}: Props) {
	const lineCount = new Set(
		colorCharts.map((colorChart) => colorChart.productLine?.name).filter(Boolean),
	).size;
	const referenceCountByChartId = colorReferences.reduce<
		Record<string, number>
	>((acc, reference) => {
		acc[reference.color_chart_id] = (acc[reference.color_chart_id] ?? 0) + 1;
		return acc;
	}, {});

	return (
		<div className="space-y-6">
			<H1Title title={title} subtitle={subtitle} />

			<section className="glass-card rounded-3xl border border-white/30 bg-white/70 p-6 shadow-xl backdrop-blur">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
					<div>
						<p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
							M3 / Coloracion
						</p>

						<h2 className="text-3xl font-bold text-slate-900">
							Consulta cartas y referencias cromaticas
						</h2>

						<p className="mt-2 max-w-3xl text-sm text-slate-600">
							Accede a las cartas de color ligadas a cada linea y abre sus tonos
							comerciales para localizar rapidamente la referencia que necesitas.
						</p>
					</div>

					<div className="flex flex-wrap gap-3 text-sm text-slate-600">
						<div className="rounded-full border border-slate-200 bg-white px-4 py-2">
							<span className="font-semibold text-slate-900">
								{colorCharts.length}
							</span>{" "}
							cartas
						</div>
						<div className="rounded-full border border-slate-200 bg-white px-4 py-2">
							<span className="font-semibold text-slate-900">
								{colorReferences.length}
							</span>{" "}
							referencias
						</div>
						<div className="rounded-full border border-slate-200 bg-white px-4 py-2">
							<span className="font-semibold text-slate-900">
								{lineCount}
							</span>{" "}
							lineas
						</div>
					</div>
				</div>
			</section>

			<EntityTable
				items={mapColorChartsToEntityTableItems(
					colorCharts,
					referenceCountByChartId,
					detailBasePath,
				)}
				config={{
					categoryLabel: "Categoria",
					showImageFilter: true,
					cardVariant: "media",
					defaultSortField: "title",
					defaultSortDirection: "asc",
					extraFilters: [
						{
							key: "productLine",
							label: "Linea comercial",
							allLabel: "Todas",
						},
					],
					gridClassName: "grid grid-cols-1 gap-3 p-3 lg:grid-cols-2",
					emptyMessage:
						"No hay cartas de color publicadas para los filtros actuales.",
				}}
			/>
		</div>
	);
}
