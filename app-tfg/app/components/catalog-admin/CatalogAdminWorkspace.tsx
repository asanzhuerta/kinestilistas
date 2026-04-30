import Link from "next/link";
import EntityTable from "@/app/components/entity-table/EntityTable";
import type {
	EntityTableConfig,
	EntityTableItem,
} from "@/app/components/entity-table/entity-table-types";
import type { Metric } from "./catalog-admin-types";

type Props = {
	entityLabel: string;
	basePath: string;
	items: EntityTableItem[];
	tableConfig?: EntityTableConfig;
	metrics?: Metric[];
	createPath?: string;
};

export default function CatalogAdminWorkspace({
	entityLabel,
	basePath,
	items,
	tableConfig,
	metrics = [],
	createPath,
}: Props) {
	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex flex-wrap gap-3 text-sm text-slate-600">
					{metrics.map((metric) => (
						<div
							key={metric.label}
							className="rounded-full border border-slate-200 bg-white px-4 py-2"
						>
							<span className="font-semibold text-slate-900">
								{metric.value}
							</span>{" "}
							{metric.label}
						</div>
					))}
				</div>

				<Link
					href={createPath ?? `${basePath}/new`}
					className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
				>
					Nuevo {entityLabel}
				</Link>
			</div>

			<EntityTable items={items} config={tableConfig} />
		</div>
	);
}
