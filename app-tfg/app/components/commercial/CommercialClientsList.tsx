"use client";

import { useMemo } from "react";
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
	const clientsCount = clientsData?.length ?? 0;

	const tableItems = useMemo(
		() => mapCommercialClientsToEntityTableItems(clientsData ?? []),
		[clientsData],
	);

	return (
		<PageTransition>
			<div className="space-y-6">
				<section className="glass-card rounded-3xl border border-white/30 bg-white/70 p-6 shadow-xl backdrop-blur">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
						<div>
							<p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
								M2 · Gestion comercial
							</p>

							<h2 className="text-3xl font-bold text-slate-900">
								Mis clientes
							</h2>

							<p className="mt-2 max-w-3xl text-sm text-slate-600">
								Aqui tienes la cartera activa asignada a tu perfil comercial.
								Puedes filtrar, buscar y abrir la ficha de cada cliente
								profesional.
							</p>
						</div>

						<div className="flex flex-wrap gap-3 text-sm text-slate-600">
							<div className="rounded-full border border-slate-200 bg-white px-4 py-2">
								<span className="font-semibold text-slate-900">
									{clientsCount}
								</span>{" "}
								clientes asignados
							</div>
						</div>
					</div>
				</section>

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
							statusLabel: "Asignacion",
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
