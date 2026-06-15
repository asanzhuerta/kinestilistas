import { notFound, redirect } from "next/navigation";
import HeaderTitle from "@/app/components/basics/HeaderTitle";
import { getUserRequestById } from "@/lib/typeorm/services/users/request";
import RequestsActions from "./RequestsActions";
import PageTransition from "@/app/components/animations/PageTransition";
import { requireAdminSession } from "@/lib/auth/require-session";
// Recibe el ID de la solicitud a revisar a través de los parámetros de la URL.
type Props = {
	params: Promise<{
		id: string;
	}>;
};

// admin/users/solicitudes/[id]
// Página de revisión individual de una solicitud de registro.
// Muestra los datos aportados por el solicitante y permite aprobar
// o rechazar la solicitud desde el panel de administración.
export default async function ReviewSolicitudPage({ params }: Props) {
	// CONTROL DE ACCESO Y PARÁMETROS
	// Resolvemos la sesión administrativa y el parámetro dinámico en paralelo.
	const { id } = await params;
	const [, solicitud] = await Promise.all([
		requireAdminSession(),
		getUserRequestById(id),
	]);

	// Si la solicitud no existe, se muestra la página de "No encontrado".
	if (!solicitud) {
		notFound();
	}

	// VALIDACIÓN DE ESTADO
	// Solo se permite revisar solicitudes que sigan pendientes.
	if (solicitud.status.code !== "pending") {
		redirect("/admin/users/requests");
	}

	// RENDER
	return (
		<PageTransition>
			<HeaderTitle
				title="Revisar solicitud"
				subtitle="Revise los datos y decida si desea aprobar o rechazar la solicitud."
			/>

			<div className="mx-auto mt-6 w-full max-w-4xl space-y-6">
				{/* TARJETA DE DETALLE */}
				{/* Muestra la información registrada en la solicitud. */}
				<div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md">
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
						{/* DATOS PERSONALES Y DE CONTACTO */}
						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
								Nombre
							</p>
							<p className="mt-1 text-sm text-slate-800">{solicitud.name}</p>
						</div>

						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
								Correo
							</p>
							<p className="mt-1 text-sm text-slate-800">{solicitud.email}</p>
						</div>

						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
								Empresa
							</p>
							<p className="mt-1 text-sm text-slate-800">
								{solicitud.company || "-"}
							</p>
						</div>

						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
								Teléfono
							</p>
							<p className="mt-1 text-sm text-slate-800">
								{solicitud.phone || "-"}
							</p>
						</div>

						{/* DATOS ESPECÍFICOS DE LA SOLICITUD */}
						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
								Rol solicitado
							</p>
							<p className="mt-1 text-sm text-slate-800">
								{solicitud.requestedRole.name}
							</p>
						</div>

						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
								Fecha de solicitud
							</p>
							<p className="mt-1 text-sm text-slate-800">
								{solicitud.requested_at.toLocaleString("es-ES")}
							</p>
						</div>
					</div>
				</div>
				{/* ACCIONES DE REVISIÓN */}
				{/* Delegan la lógica interactiva al componente cliente correspondiente. */}
				<RequestsActions
					solicitudId={id}
					requiresCommercialAssignment={
						solicitud.requestedRole.name.toLowerCase() === "cliente"
					}
				/>{" "}
			</div>
		</PageTransition>
	);
}
