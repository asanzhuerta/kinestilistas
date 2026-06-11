import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import PageTransition from "@/app/components/animations/PageTransition";
import H1Title from "@/app/components/H1Title";
import UserAvatar from "@/app/components/users/UserAvatar";
import { requireAdminSession } from "@/lib/auth/require-session";
import { getClientById } from "@/lib/typeorm/services/commercial/client";
import { formatDate } from "@/lib/utils/user-utils";

type PageProps = {
	params: Promise<{
		id: string;
	}>;
};

function DetailRow({
	label,
	value,
}: {
	label: string;
	value?: string | null;
}) {
	return (
		<p className="text-sm leading-6 text-slate-700">
			<span className="font-semibold text-slate-950">{label}:</span>{" "}
			{value?.trim() || "-"}
		</p>
	);
}

function DetailCard({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}) {
	return (
		<div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
			<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
				{title}
			</p>
			<div className="mt-3 space-y-1">{children}</div>
		</div>
	);
}

export default async function AdminClientDetailPage({ params }: PageProps) {
	const [{ id }] = await Promise.all([params, requireAdminSession()]);
	const client = await getClientById(id);

	if (!client) {
		notFound();
	}

	const activeAssignment = Array.isArray(client.commercialAssignments)
		? (client.commercialAssignments[0] ?? null)
		: null;

	const assignedCommercial = activeAssignment?.commercial ?? null;
	const assignedCommercialUser = assignedCommercial?.user ?? null;

	return (
		<PageTransition>
			<div className="space-y-6">
				<H1Title
					title="Ficha de cliente"
					subtitle="Detalle del cliente profesional y su comercial asignado."
				/>

				<section className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-xl backdrop-blur sm:p-6">
					<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
						<div className="flex min-w-0 items-start gap-4">
							<UserAvatar
								name={client.user?.name ?? client.name}
								imageUrl={client.user?.profile_image_url ?? null}
								size="lg"
								className="shrink-0"
							/>

							<div className="min-w-0">
								<span className="inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold text-cyan-800">
									Cliente profesional
								</span>
								<h1 className="mt-3 break-words text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
									{client.name}
								</h1>
								<p className="mt-2 text-sm text-slate-600">
									{client.user?.email || "Sin correo vinculado"}
								</p>
								<p className="mt-1 text-sm text-slate-500">
									Creado el {formatDate(client.created_at)}
								</p>
							</div>
						</div>

						<Link
							href={`/admin/clients/assignments?clientId=${client.id}`}
							className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:w-auto"
						>
							Gestionar asignación
						</Link>
					</div>
				</section>

				<div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)]">
					<section className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-xl backdrop-blur sm:p-6">
						<div className="mb-5">
							<h2 className="text-xl font-semibold tracking-tight text-slate-950">
								Datos del cliente
							</h2>
							<p className="mt-1 text-sm text-slate-600">
								Información principal para administración y seguimiento.
							</p>
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<DetailCard title="Contacto">
								<DetailRow label="Nombre" value={client.contact_name} />
								<DetailRow label="Correo" value={client.user?.email} />
								<DetailRow label="Teléfono" value={client.user?.phone} />
								<DetailRow label="Empresa" value={client.user?.company} />
							</DetailCard>

							<DetailCard title="Datos fiscales y ubicación">
								<DetailRow label="NIF/CIF" value={client.tax_id} />
								<DetailRow label="Dirección" value={client.address} />
								<DetailRow label="Ciudad" value={client.city} />
								<DetailRow label="Provincia" value={client.province} />
								<DetailRow label="Código postal" value={client.postal_code} />
							</DetailCard>
						</div>

						<div className="mt-4 grid gap-4 md:grid-cols-2">
							<DetailCard title="Coordenadas">
								<DetailRow label="Latitud" value={client.lat} />
								<DetailRow label="Longitud" value={client.lng} />
							</DetailCard>

							<DetailCard title="Notas">
								<p className="text-sm leading-6 text-slate-700">
									{client.notes || "Sin notas registradas."}
								</p>
							</DetailCard>
						</div>
					</section>

					<aside className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-xl backdrop-blur sm:p-6">
						<div className="flex items-start justify-between gap-3">
							<div>
								<h2 className="text-xl font-semibold tracking-tight text-slate-950">
									Comercial asignado
								</h2>
								<p className="mt-1 text-sm text-slate-600">
									Cartera activa del cliente.
								</p>
							</div>
							<span
								className={`rounded-full px-3 py-1 text-xs font-semibold ${
									assignedCommercial
										? "border border-cyan-200 bg-cyan-50 text-cyan-800"
										: "border border-amber-200 bg-amber-50 text-amber-800"
								}`}
							>
								{assignedCommercial ? "Asignado" : "Pendiente"}
							</span>
						</div>

						{assignedCommercial ? (
							<div className="mt-5 space-y-4">
								<div className="rounded-3xl border border-cyan-100 bg-cyan-50/80 p-5 shadow-sm">
									<p className="text-base font-semibold text-cyan-950">
										{assignedCommercialUser?.name || "Comercial sin nombre"}
									</p>
									<p className="mt-1 text-sm text-cyan-800">
										{assignedCommercialUser?.email || "Sin correo"}
									</p>
								</div>

								<DetailCard title="Asignación">
									<DetailRow
										label="Código"
										value={assignedCommercial.employee_code}
									/>
									<DetailRow
										label="Territorio"
										value={assignedCommercial.territory}
									/>
									<DetailRow
										label="Asignado el"
										value={formatDate(activeAssignment?.assigned_at)}
									/>
									<DetailRow
										label="Notas"
										value={activeAssignment?.notes || "-"}
									/>
								</DetailCard>
							</div>
						) : (
							<div className="mt-5 rounded-3xl border border-amber-200 bg-amber-50/80 p-5 text-sm leading-6 text-amber-800">
								Este cliente no tiene comercial asignado actualmente.
							</div>
						)}
					</aside>
				</div>
			</div>
		</PageTransition>
	);
}
