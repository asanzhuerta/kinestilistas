"use client";

import { useMemo } from "react";
import PageTransition from "@/app/components/animations/PageTransition";
import UserAvatar from "@/app/components/users/UserAvatar";
import { useCommercialClient } from "@/app/hooks/api/useCommercialClient";
import { formatDate, formatDateShort } from "@/lib/utils/user-utils";
import CommercialClientInfoItem from "./CommercialClientInfoItem";
import CommercialClientInfoSection from "./CommercialClientInfoSection";
import {
	getActiveAssignment,
	getClientLocation,
} from "./commercial-client-types";

type Props = {
	clientId: string;
};

export default function CommercialClientDetail({ clientId }: Props) {
	const { data: client, loading, error } = useCommercialClient(clientId);
	const activeAssignment = client ? getActiveAssignment(client) : null;

	const clientItems = useMemo(() => {
		if (!client) return [];

		return [
			{ label: "Nombre del establecimiento", value: client.name },
			{ label: "Persona de contacto", value: client.contact_name },
			{ label: "Identificador fiscal", value: client.tax_id },
			{ label: "Correo vinculado", value: client.user?.email },
			{ label: "Teléfono", value: client.user?.phone },
			{ label: "Empresa", value: client.user?.company },
			{ label: "Dirección", value: client.address },
			{ label: "Ciudad", value: client.city },
			{ label: "Código postal", value: client.postal_code },
			{ label: "Provincia", value: client.province },
			{ label: "Fecha de alta", value: formatDate(client.created_at) },
			{
				label: "Última actualización",
				value: formatDate(client.updated_at),
			},
		];
	}, [client]);

	const assignmentItems = useMemo(
		() => [
			{
				label: "Comercial responsable",
				value: activeAssignment?.commercial?.user?.name ?? "-",
			},
			{
				label: "Correo del comercial",
				value: activeAssignment?.commercial?.user?.email ?? "-",
			},
			{
				label: "Teléfono del comercial",
				value: activeAssignment?.commercial?.user?.phone ?? "-",
			},
			{
				label: "Código interno",
				value: activeAssignment?.commercial?.employee_code ?? "-",
			},
			{
				label: "Territorio",
				value: activeAssignment?.commercial?.territory ?? "-",
			},
			{
				label: "Asignado desde",
				value: formatDateShort(activeAssignment?.assigned_at ?? null),
			},
		],
		[activeAssignment],
	);

	const accountItems = useMemo(
		() => [
			{ label: "Nombre", value: client?.user?.name },
			{ label: "Correo", value: client?.user?.email },
			{ label: "Teléfono", value: client?.user?.phone },
			{ label: "Empresa", value: client?.user?.company },
		],
		[client],
	);

	return (
		<PageTransition>
			<div className="space-y-6">
				{loading ? (
					<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<div className="space-y-3">
							<div className="h-6 w-56 animate-pulse rounded bg-slate-200" />
							<div className="h-4 w-full animate-pulse rounded bg-slate-100" />
							<div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
						</div>
					</section>
				) : null}

				{!loading && error ? (
					<section className="rounded-3xl border border-red-200 bg-red-50 p-6 shadow-sm">
						<h2 className="text-xl font-bold text-red-700">
							No se pudo cargar la ficha
						</h2>
						<p className="mt-2 text-sm text-red-600">{error}</p>
					</section>
				) : null}

				{!loading && !error && client ? (
					<>
						<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
							<div className="flex flex-col gap-5 lg:flex-row lg:items-start">
								<UserAvatar
									name={client.user?.name ?? client.name}
									imageUrl={client.user?.profile_image_url ?? null}
									size="xl"
								/>

								<div className="min-w-0 flex-1">
									<h1 className="mt-2 text-3xl font-bold text-slate-900">
										{client.name}
									</h1>

									<p className="mt-2 text-sm text-slate-600">
										{client.contact_name ||
											"Sin persona de contacto registrada"}
									</p>

									<p className="mt-2 text-sm text-slate-500">
										{client.user?.email || "Sin correo vinculado"}
									</p>

									<div className="mt-4 flex flex-wrap gap-2">
										<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
											{getClientLocation(client)}
										</span>

										{client.tax_id ? (
											<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
												{client.tax_id}
											</span>
										) : null}

										{activeAssignment?.commercial?.territory ? (
											<span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
												{activeAssignment.commercial.territory}
											</span>
										) : null}
									</div>
								</div>
							</div>
						</section>

						<section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
							<div className="space-y-6">
								<CommercialClientInfoSection
									title="Datos del cliente profesional"
									items={clientItems}
								/>

								<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
									<h2 className="text-xl font-bold text-slate-900">
										Notas internas
									</h2>

									<div className="mt-5">
										<CommercialClientInfoItem
											label="Observaciones"
											value={client.notes}
										/>
									</div>
								</section>
							</div>

							<div className="space-y-6">
								<CommercialClientInfoSection
									title="Asignación comercial activa"
									items={assignmentItems}
								/>

								<CommercialClientInfoSection
									title="Cuenta vinculada"
									items={accountItems}
								/>
							</div>
						</section>
					</>
				) : null}
			</div>
		</PageTransition>
	);
}
