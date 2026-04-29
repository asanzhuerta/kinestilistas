import H1Title from "@/app/components/H1Title";
import CatalogAdminWorkspace from "@/app/components/catalog-admin/CatalogAdminWorkspace";
import type { EntityTableItem } from "@/app/components/entity-table/entity-table-types";
import {
	getSupportResourceFields,
	getSupportResourceInitialValues,
} from "@/app/admin/catalog/_shared/catalog-form-config";
import { listSupportResourceTypes } from "@/lib/typeorm/services/catalog/lookups";
import { listProductLines } from "@/lib/typeorm/services/catalog/product-line";
import { listProducts } from "@/lib/typeorm/services/catalog/product";
import { listSupportResources } from "@/lib/typeorm/services/catalog/support-resource";
import { formatDateShort } from "@/lib/utils/user-utils";

function mapSupportResourceToItem(
	supportResource: Awaited<ReturnType<typeof listSupportResources>>[number],
): EntityTableItem {
	return {
		id: supportResource.id,
		title: supportResource.title,
		subtitle: supportResource.resource_url,
		category: supportResource.resourceType?.name ?? "Tipo no disponible",
		status: supportResource.product ? "Producto" : "Linea",
		primaryDate: supportResource.created_at.toISOString(),
		badges: [
			{
				label: supportResource.resourceType?.name ?? "Sin tipo",
				className: "bg-violet-100 text-violet-700 border border-violet-200",
			},
		],
		fields: [
			{
				label: "Producto",
				value: supportResource.product?.name || "-",
			},
			{
				label: "Linea",
				value: supportResource.productLine?.name || "-",
			},
			{
				label: "Alta",
				value: formatDateShort(supportResource.created_at),
			},
			{
				label: "Descripcion",
				value: supportResource.description || "-",
			},
		],
		actions: [
			{
				label: "Editar",
				href: `/admin/catalog/support-resources/${supportResource.id}/edit`,
				variant: "secondary",
			},
		],
		searchText: [
			supportResource.title,
			supportResource.description,
			supportResource.resource_url,
			supportResource.resourceType?.name,
			supportResource.product?.name,
			supportResource.productLine?.name,
		]
			.filter(Boolean)
			.join(" "),
	};
}

export default async function AdminSupportResourcesPage() {
	const [supportResources, supportResourceTypes, products, productLines] =
		await Promise.all([
			listSupportResources(),
			listSupportResourceTypes(),
			listProducts(),
			listProductLines(),
		]);

	return (
		<div className="space-y-6">
			<H1Title
				title="Recursos de apoyo"
				subtitle="Centraliza fichas tecnicas, catalogos comerciales y material formativo"
			/>

			<CatalogAdminWorkspace
				entityLabel="recurso"
				entityLabelPlural="los recursos de apoyo"
				basePath="/admin/catalog/support-resources"
				apiBasePath="/api/admin/catalog/support-resources"
				items={supportResources.map(mapSupportResourceToItem)}
				initialValues={getSupportResourceInitialValues()}
				fields={getSupportResourceFields({
					supportResourceTypes,
					products,
					productLines,
				})}
				editPathPattern="/admin/catalog/support-resources/[id]/edit"
				createRedirectToEdit
				metrics={[
					{ label: "recursos", value: supportResources.length },
					{
						label: "ligados a producto",
						value: supportResources.filter((resource) => Boolean(resource.product_id))
							.length,
					},
					{
						label: "ligados a linea",
						value: supportResources.filter((resource) =>
							Boolean(resource.product_line_id),
						).length,
					},
				]}
				tableConfig={{
					categoryLabel: "Tipo",
					statusLabel: "Contexto",
					emptyMessage: "No hay recursos de apoyo registrados todavia.",
				}}
			/>
		</div>
	);
}
