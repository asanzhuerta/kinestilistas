import Link from "next/link";
import PageTransition from "@/app/components/animations/PageTransition";
import type { AdminOperationalStatusCode } from "@/lib/contracts/admin-operational-overview";
import { getAdminOperationalOverview } from "@/lib/admin/operational-overview";

export const dynamic = "force-dynamic";

const statusStyles: Record<AdminOperationalStatusCode, string> = {
	ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
	warning: "border-amber-200 bg-amber-50 text-amber-700",
	attention: "border-rose-200 bg-rose-50 text-rose-700",
};

function formatDateTime(value: string) {
	return new Intl.DateTimeFormat("es-ES", {
		dateStyle: "short",
		timeStyle: "short",
	}).format(new Date(value));
}

export default async function AdminOperationsPage() {
	const overview = await getAdminOperationalOverview();

	return (
		<PageTransition>
			<div className="space-y-6">
				<section className="glass-card rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur">
					<p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
						M7 - Estado operativo
					</p>
					<h1 className="text-3xl font-bold text-slate-900">
						Operacion transversal
					</h1>
					<p className="mt-2 max-w-3xl text-sm text-slate-600">
						Resumen ejecutivo de las capacidades transversales de
						administracion: auditoria, rate limiting, integraciones y soporte
						tecnico. Sirve como punto de entrada rapido para revisar el estado
						del modulo 7.
					</p>
					<div className="mt-4 flex flex-wrap gap-3">
						<Link
							href="/admin"
							className="inline-flex w-fit rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white"
						>
							Volver al panel
						</Link>
						<Link
							href="/api/admin/operations/report"
							className="inline-flex w-fit rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
						>
							Exportar informe CSV
						</Link>
					</div>
				</section>

				<section className="grid gap-4 md:grid-cols-4">
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">Bloques M7</p>
						<p className="mt-2 text-3xl font-semibold text-slate-900">
							{overview.summary.total}
						</p>
					</div>
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">Operativos</p>
						<p className="mt-2 text-3xl font-semibold text-emerald-700">
							{overview.summary.ready}
						</p>
					</div>
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">A revisar</p>
						<p className="mt-2 text-3xl font-semibold text-amber-700">
							{overview.summary.warning}
						</p>
					</div>
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">Atencion</p>
						<p className="mt-2 text-3xl font-semibold text-rose-700">
							{overview.summary.attention}
						</p>
					</div>
				</section>

				<section className="glass-card rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur">
					<div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
						<div>
							<h2 className="text-xl font-semibold text-slate-900">
								Resumen por capacidad
							</h2>
							<p className="mt-1 text-sm text-slate-600">
								Ultima lectura: {formatDateTime(overview.summary.lastCheckedAt)}
							</p>
						</div>
						<p className="text-xs text-slate-500">
							Datos agregados desde base de datos, politicas de seguridad e
							inventarios de soporte.
						</p>
					</div>

					<div className="grid gap-4 xl:grid-cols-2">
						{overview.sections.map((section) => (
							<article
								key={section.slug}
								className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
							>
								<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<h3 className="text-lg font-semibold text-slate-900">
											{section.title}
										</h3>
										<p className="mt-2 text-sm text-slate-600">
											{section.description}
										</p>
									</div>
									<span
										className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[section.status]}`}
									>
										{section.statusLabel}
									</span>
								</div>

								<div className="mt-5 grid grid-cols-2 gap-3">
									{section.metrics.map((metric) => (
										<div
											key={`${section.slug}-${metric.label}`}
											className="rounded-2xl bg-slate-50 px-4 py-3"
										>
											<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
												{metric.label}
											</p>
											<p className="mt-1 text-xl font-semibold text-slate-900">
												{metric.value}
											</p>
											{metric.helper ? (
												<p className="mt-1 text-xs text-slate-500">
													{metric.helper}
												</p>
											) : null}
										</div>
									))}
								</div>

								<Link
									href={section.href}
									className="mt-5 inline-flex rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
								>
									Abrir detalle
								</Link>
							</article>
						))}
					</div>
				</section>
			</div>
		</PageTransition>
	);
}
