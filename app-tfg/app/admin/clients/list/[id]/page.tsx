import Link from "next/link";
import { notFound } from "next/navigation";
import PageTransition from "@/app/components/animations/PageTransition";
import UserAvatar from "@/app/components/users/UserAvatar";
import { requireAdminSession } from "@/lib/auth/require-session";
import { getClientById } from "@/lib/typeorm/services/commercial/client";

type PageProps = {
	params: Promise<{
		id: string;
	}>;
};

function formatDate(value?: Date | string | null) {
	if (!value) return "-";

	const date = value instanceof Date ? value : new Date(value);

	if (Number.isNaN(date.getTime())) {
		return "-";
	}

	return date.toLocaleString("es-ES", {
		dateStyle: "medium",
		timeStyle: "short",
	});
}

export default async function AdminClientDetailPage({ params }: PageProps) {
	await requireAdminSession();

	const { id } = await params;
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
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p className="text-sm font-medium uppercase tracking-wide text-slate-500">
							M2 · Gestión comercial
						</p>
						<h1 className="text-3xl font-bold text-slate-900">
							Ficha de cliente
						</h1>
						<p className="mt-2 text-sm text-slate-600">
							Detalle del cliente y de su comercial asignado actual.
						</p>
					</div>

					<div className="flex flex-wrap gap-3">
						<Link
							href="/admin/clients"
							className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
						>
							Volver a clientes
						</Link>

						<Link
							href={`/admin/clients/assignments?clientId=${client.id}`}
							className="inline-flex items-center rounded-2xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
						>
							Gestionar asignación
						</Link>
					</div>
				</div>

				<div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
					<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<div className="flex items-start gap-4">
							<UserAvatar
								name={client.user?.name ?? client.name}
								imageUrl={client.user?.profile_image_url ?? null}
								size="lg"
								className="shrink-0"
							/>

							<div className="min-w-0">
								<h2 className="text-2xl font-semibold text-slate-900">
									{client.name}
								</h2>
								<p className="mt-1 text-sm text-slate-500">
									{client.user?.email || "Sin correo vinculado"}
								</p>
								<p className="mt-1 text-sm text-slate-500">
									Creado el {formatDate(client.created_at)}
								</p>
							</div>
						</div>

						<div className="mt-6 grid gap-4 sm:grid-cols-2">
							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
									Contacto
								</p>
								<p className="mt-2 text-sm text-slate-800">
									<strong>Nombre:</strong> {client.contact_name || "-"}
								</p>
								<p className="mt-1 text-sm text-slate-800">
									<strong>Correo:</strong> {client.user?.email || "-"}
								</p>
								<p className="mt-1 text-sm text-slate-800">
									<strong>Teléfono:</strong> {client.user?.phone || "-"}
								</p>
								<p className="mt-1 text-sm text-slate-800">
									<strong>Empresa:</strong> {client.user?.company || "-"}
								</p>
							</div>

							<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
								<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
									Datos fiscales y ubicación
								</p>
								<p className="mt-2 text-sm text-slate-800">
									<strong>NIF/CIF:</strong> {client.tax_id || "-"}
								</p>
								<p className="mt-1 text-sm text-slate-800">
									<strong>Dirección:</strong> {client.address || "-"}
								</p>
								<p className="mt-1 text-sm text-slate-800">
									<strong>Ciudad:</strong> {client.city || "-"}
								</p>
								<p className="mt-1 text-sm text-slate-800">
									<strong>Provincia:</strong> {client.province || "-"}
								</p>
								<p className="mt-1 text-sm text-slate-800">
									<strong>Código postal:</strong> {client.postal_code || "-"}
								</p>
								<p className="mt-1 text-sm text-slate-800">
									<strong>Latitud:</strong> {client.lat || "-"}
								</p>
								<p className="mt-1 text-sm text-slate-800">
									<strong>Longitud:</strong> {client.lng || "-"}
								</p>
							</div>
						</div>

						<div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<p className="text-xs font-medium uppercase tracking-wide text-slate-500">
								Notas
							</p>
							<p className="mt-2 text-sm text-slate-800">
								{client.notes || "Sin notas registradas."}
							</p>
						</div>
					</section>

					<section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
						<h2 className="text-lg font-semibold text-slate-900">
							Comercial asignado actual
						</h2>

						{assignedCommercial ? (
							<div className="mt-4 space-y-4">
								<div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4">
									<p className="text-sm font-semibold text-cyan-900">
										{assignedCommercialUser?.name || "Comercial sin nombre"}
									</p>
									<p className="mt-1 text-sm text-cyan-800">
										{assignedCommercialUser?.email || "Sin correo"}
									</p>
								</div>

								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<p className="text-sm text-slate-800">
										<strong>Código:</strong>{" "}
										{assignedCommercial.employee_code || "-"}
									</p>
									<p className="mt-1 text-sm text-slate-800">
										<strong>Territorio:</strong>{" "}
										{assignedCommercial.territory || "-"}
									</p>
									<p className="mt-1 text-sm text-slate-800">
										<strong>Asignado el:</strong>{" "}
										{formatDate(activeAssignment?.assigned_at)}
									</p>
									<p className="mt-1 text-sm text-slate-800">
										<strong>Notas asignación:</strong>{" "}
										{activeAssignment?.notes || "-"}
									</p>
								</div>
							</div>
						) : (
							<div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
								Este cliente no tiene comercial asignado actualmente.
							</div>
						)}
					</section>
				</div>
			</div>
		</PageTransition>
	);
}
