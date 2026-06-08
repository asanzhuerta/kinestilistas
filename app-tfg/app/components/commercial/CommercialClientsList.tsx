"use client";

import { useMemo } from "react";
import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";
import EntityTable from "@/app/components/entity-table/EntityTable";
import { useCommercialClients } from "@/app/hooks/api/useCommercialClients";
import { mapCommercialClientsToEntityTableItems } from "./commercial-client-table-mappers";

export default function CommercialClientsList() {
	const {
		data: clientsData,
		loading,
		error,
	} = useCommercialClients();

	const tableItems = useMemo(
		() => mapCommercialClientsToEntityTableItems(clientsData ?? []),
		[clientsData],
	);

	return (
		<PageTransition>
			<div className="space-y-6">
				<H1Title
					title="Mis clientes"
					subtitle="Aquí tienes la cartera activa asignada a tu perfil comercial. Puedes filtrar, buscar y abrir la ficha de cada cliente profesional."
				/>

				{loading ? (
					<section className="glass-card rounded-3xl border border-white/30 bg-white/70 p-6 shadow-xl backdrop-blur">
						<div className="space-y-3">
							<div className="h-5 w-48 animate-pulse rounded bg-slate-200" />
							<div className="h-4 w-full animate-pulse rounded bg-slate-100" />
							<div className="h-4 w-5/6 animate-pulse rounded bg-slate-100" />
						</div>
					</section>
				) : null}

				{!loading && error ? (
					<section className="glass-card rounded-3xl border border-red-200 bg-red-50/80 p-6 shadow-xl backdrop-blur">
						<h3 className="text-lg font-semibold text-red-700">
							No se pudieron cargar los clientes
						</h3>
						<p className="mt-2 text-sm text-red-600">{error}</p>
					</section>
				) : null}

				{!loading && !error ? (
					<EntityTable
						items={tableItems}
						config={{
							categoryLabel: "Provincia",
							statusLabel: "Asignación",
							showImageFilter: true,
							emptyMessage:
								"No hay clientes que coincidan con los filtros actuales.",
						}}
					/>
				) : null}
			</div>
		</PageTransition>
	);
}
