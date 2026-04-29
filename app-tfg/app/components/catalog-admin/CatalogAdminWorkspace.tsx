import Link from "next/link";
import EntityTable from "@/app/components/entity-table/EntityTable";
import type {
	EntityTableConfig,
	EntityTableItem,
} from "@/app/components/entity-table/entity-table-types";
import CatalogAdminForm from "./CatalogAdminForm";
import type {
	FieldDescriptor,
	FormValue,
	Metric,
} from "./catalog-admin-types";

type Props = {
	entityLabel: string;
	entityLabelPlural: string;
	basePath: string;
	apiBasePath: string;
	items: EntityTableItem[];
	fields: FieldDescriptor[];
	initialValues: Record<string, FormValue>;
	tableConfig?: EntityTableConfig;
	metrics?: Metric[];
	editPathPattern?: string;
	createRedirectToEdit?: boolean;
};

export default function CatalogAdminWorkspace({
	entityLabel,
	entityLabelPlural,
	basePath,
	apiBasePath,
	items,
	fields,
	initialValues,
	tableConfig,
	metrics = [],
	editPathPattern,
	createRedirectToEdit = false,
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
					href={basePath}
					className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
				>
					Nuevo {entityLabel}
				</Link>
			</div>

			<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
				<CatalogAdminForm
					entityLabel={entityLabel}
					entityLabelPlural={entityLabelPlural}
					basePath={basePath}
					apiBasePath={apiBasePath}
					initialValues={initialValues}
					fields={fields}
					editPathPattern={editPathPattern}
					createRedirectToEdit={createRedirectToEdit}
				/>
			</section>

			<EntityTable items={items} config={tableConfig} />
		</div>
	);
}
