import Link from "next/link";
import PageTransition from "@/app/components/animations/PageTransition";
import {
	listIntegrationStatusItems,
	summarizeIntegrationStatusItems,
} from "@/lib/integrations/operational-status";
import type { IntegrationStatusCode } from "@/lib/contracts/integration-status";

export const dynamic = "force-dynamic";

const statusStyles: Record<IntegrationStatusCode, string> = {
	operational: "border-emerald-200 bg-emerald-50 text-emerald-700",
	degraded: "border-amber-200 bg-amber-50 text-amber-700",
	not_configured: "border-rose-200 bg-rose-50 text-rose-700",
};

function formatDateTime(value: string) {
	return new Intl.DateTimeFormat("es-ES", {
		dateStyle: "short",
		timeStyle: "short",
	}).format(new Date(value));
}

export default function AdminIntegrationsPage() {
	const integrations = listIntegrationStatusItems();
	const summary = summarizeIntegrationStatusItems(integrations);

	return (
		<PageTransition>
			<div className="space-y-6">
				<section className="glass-card rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur">
					<p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
						M7 - Administracion transversal
					</p>
					<h1 className="text-3xl font-bold text-slate-900">
						Integraciones y soporte
					</h1>
					<p className="mt-2 max-w-3xl text-sm text-slate-600">
						Inventario operativo de servicios externos que sostienen los
						modulos ya implementados. No ejecuta sincronizaciones externas:
						expone configuracion, uso funcional y comportamiento de
						degradacion.
					</p>
					<Link
						href="/admin"
						className="mt-4 inline-flex w-fit rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white"
					>
						Volver al panel
					</Link>
					<Link
						href="/admin/enterprise-operations"
						className="ml-0 mt-3 inline-flex w-fit rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 sm:ml-3"
					>
						Registro empresarial
					</Link>
				</section>

				<section className="grid gap-4 md:grid-cols-4">
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">Integraciones</p>
						<p className="mt-2 text-3xl font-semibold text-slate-900">
							{summary.total}
						</p>
					</div>
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">Operativas</p>
						<p className="mt-2 text-3xl font-semibold text-emerald-700">
							{summary.operational}
						</p>
					</div>
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">A revisar</p>
						<p className="mt-2 text-3xl font-semibold text-amber-700">
							{summary.degraded}
						</p>
					</div>
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">Sin configurar</p>
						<p className="mt-2 text-3xl font-semibold text-rose-700">
							{summary.notConfigured}
						</p>
					</div>
				</section>

				<section className="glass-card rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur">
					<div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
						<div>
							<h2 className="text-xl font-semibold text-slate-900">
								Estado operativo
							</h2>
							<p className="mt-1 text-sm text-slate-600">
								Ultima lectura: {formatDateTime(summary.lastCheckedAt)}
							</p>
						</div>
						<p className="text-xs text-slate-500">
							Datos calculados desde variables de entorno y proveedores usados
							por la aplicacion.
						</p>
					</div>

					<div className="grid gap-4 xl:grid-cols-2">
						{integrations.map((integration) => (
							<article
								key={integration.slug}
								className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
							>
								<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
											{integration.category}
										</p>
										<h3 className="mt-1 text-lg font-semibold text-slate-900">
											{integration.title}
										</h3>
										<p className="mt-1 text-sm text-slate-500">
											{integration.provider}
										</p>
									</div>
									<span
										className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[integration.status]}`}
									>
										{integration.statusLabel}
									</span>
								</div>

								<p className="mt-4 text-sm text-slate-600">
									{integration.description}
								</p>

								<div className="mt-4 grid gap-3">
									<div className="rounded-2xl bg-slate-50 px-4 py-3">
										<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
											Uso operativo
										</p>
										<p className="mt-1 text-sm text-slate-700">
											{integration.operationalUse}
										</p>
									</div>
									<div className="rounded-2xl bg-slate-50 px-4 py-3">
										<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
											Degradacion controlada
										</p>
										<p className="mt-1 text-sm text-slate-700">
											{integration.fallbackBehavior}
										</p>
									</div>
								</div>

								<div className="mt-4 rounded-2xl border border-slate-200">
									{integration.configuration.map((item) => (
										<div
											key={`${integration.slug}-${item.label}`}
											className="flex flex-col gap-1 border-b border-slate-100 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
										>
											<span className="text-sm font-medium text-slate-600">
												{item.label}
											</span>
											<span className="break-all text-sm text-slate-500">
												{item.sensitive && item.value === "Configurada"
													? "Configurada (oculta)"
													: item.value}
											</span>
										</div>
									))}
								</div>
							</article>
						))}
					</div>
				</section>
			</div>
		</PageTransition>
	);
}
