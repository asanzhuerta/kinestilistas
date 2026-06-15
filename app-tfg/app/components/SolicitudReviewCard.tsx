import Link from "next/link";
import SafeForm from "@/app/components/forms/SafeForm";
import SubmitButton from "@/app/components/forms/SubmitButton";

type Solicitud = {
	id: string;
	name: string;
	email: string;
	company: string;
	phone: string | null;
	requested_at: string | Date;
};

type Props = {
	title: string;
	description: string;
	solicitud: Solicitud;
	actionLabel: string;
	actionHref: string;
	actionColor: "green" | "red";
	showRejectionReason?: boolean;
};

const solicitudDateFormatter = new Intl.DateTimeFormat("es-ES", {
	timeZone: "Europe/Madrid",
	day: "2-digit",
	month: "2-digit",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});

function formatFecha(fecha: string | Date) {
	return solicitudDateFormatter.format(new Date(fecha));
}

export default function SolicitudReviewCard({
	title,
	description,
	solicitud,
	actionLabel,
	actionHref,
	actionColor,
	showRejectionReason = false,
}: Props) {
	const actionClasses =
		actionColor === "green"
			? "bg-green-600 hover:bg-green-700"
			: "bg-red-600 hover:bg-red-700";

	return (
		<div className="mx-auto mt-6 w-full max-w-3xl">
			<div className="glass-card rounded-2xl p-6">
				<h2 className="text-xl font-semibold text-black">{title}</h2>

				<p className="mt-2 text-sm text-black/80">{description}</p>

				<div className="mt-6 grid gap-4 sm:grid-cols-2">
					<div className="glass-section rounded-xl p-4">
						<p className="text-xs font-medium uppercase text-black/70">
							Nombre
						</p>
						<p className="mt-1 text-sm text-black">{solicitud.name}</p>
					</div>

					<div className="glass-section rounded-xl p-4">
						<p className="text-xs font-medium uppercase text-black/70">
							Correo
						</p>
						<p className="mt-1 text-sm text-black">{solicitud.email}</p>
					</div>

					<div className="glass-section rounded-xl p-4">
						<p className="text-xs font-medium uppercase text-black/70">
							Empresa
						</p>
						<p className="mt-1 text-sm text-black">{solicitud.company}</p>
					</div>

					<div className="glass-section rounded-xl p-4">
						<p className="text-xs font-medium uppercase text-black/70">
							Teléfono
						</p>
						<p className="mt-1 text-sm text-black">{solicitud.phone || "-"}</p>
					</div>

					<div className="glass-section rounded-xl p-4 sm:col-span-2">
						<p className="text-xs font-medium uppercase text-black/70">
							Fecha de solicitud
						</p>
						<p className="mt-1 text-sm text-black">
							{formatFecha(solicitud.requested_at)}
						</p>
					</div>
				</div>

				{showRejectionReason ? (
					<SafeForm
						action={actionHref}
						className="mt-6"
						disableUntilHydrated={false}
					>
						<label
							htmlFor="rejection_reason"
							className="mb-2 block text-sm font-medium text-black/85"
						>
							Motivo del rechazo
						</label>

						<textarea
							id="rejection_reason"
							name="rejection_reason"
							rows={4}
							placeholder="Escriba aquí el motivo del rechazo..."
							className="glass-input w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
						/>

						<div className="mt-6 flex flex-wrap gap-3">
							<SubmitButton
								className={`rounded-lg px-4 py-2 font-medium text-white ${actionClasses}`}
							>
								{actionLabel}
							</SubmitButton>

							<Link
								href="/admin/solicitudes"
								className="glass-section rounded-lg px-4 py-2 font-medium text-black transition hover:bg-white/15"
							>
								Cancelar
							</Link>
						</div>
					</SafeForm>
				) : (
					<div className="mt-6 flex flex-wrap gap-3">
						<SafeForm action={actionHref} disableUntilHydrated={false}>
							<SubmitButton
								className={`rounded-lg px-4 py-2 font-medium text-white ${actionClasses}`}
							>
								{actionLabel}
							</SubmitButton>
						</SafeForm>

						<Link
							href="/admin/solicitudes"
							className="glass-section rounded-lg px-4 py-2 font-medium text-black transition hover:bg-white/15"
						>
							Cancelar
						</Link>
					</div>
				)}
			</div>
		</div>
	);
}
