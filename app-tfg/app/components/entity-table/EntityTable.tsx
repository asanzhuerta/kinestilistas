"use client";

import PageTransition from "@/app/components/animations/PageTransition";
import EntityTableFilters from "./EntityTableFilters";
import EntityTableView from "./EntityTableView";
import { useEntityTable } from "./useEntityTable";
import type { EntityTableConfig, EntityTableItem } from "./entity-table-types";

type Props = {
	items: EntityTableItem[];
	config?: EntityTableConfig;
};

// Componente contenedor reutilizable para mostrar listados de entidades.
// Integra filtros, ordenación y vista de tarjetas en un único punto.
export default function EntityTable({ items, config }: Props) {
	// ESTADO Y LÓGICA DE TABLA
	// Gestiona búsqueda, filtros y ordenación mediante un hook reutilizable.
	const table = useEntityTable(items, config);

	// RENDER
	return (
		<PageTransition>
			<div className="space-y-4">
				<EntityTableFilters
					search={table.search}
					setSearch={table.setSearch}
					categoryFilter={table.categoryFilter}
					setCategoryFilter={table.setCategoryFilter}
					statusFilter={table.statusFilter}
					setStatusFilter={table.setStatusFilter}
					hasImageFilter={table.hasImageFilter}
					setHasImageFilter={table.setHasImageFilter}
					hideInactiveItems={table.hideInactiveItems}
					setHideInactiveItems={table.setHideInactiveItems}
					extraFilterValues={table.extraFilterValues}
					setExtraFilterValue={table.setExtraFilterValue}
					extraFilters={config?.extraFilters ?? []}
					extraFilterOptions={table.extraFilterOptions}
					sortField={table.sortField}
					setSortField={table.setSortField}
					sortDirection={table.sortDirection}
					setSortDirection={table.setSortDirection}
					categories={table.categories}
					statuses={table.statuses}
					filteredCount={table.filteredAndSortedItems.length}
					totalCount={items.length}
					resetFilters={table.resetFilters}
					config={config}
				/>

				<EntityTableView
					items={table.filteredAndSortedItems}
					emptyMessage={config?.emptyMessage}
				/>
			</div>
		</PageTransition>
	);
}
