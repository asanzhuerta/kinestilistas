import Link from "next/link";
import PageTransition from "@/app/components/animations/PageTransition";
import type { SupportCapabilityStatusCode } from "@/lib/contracts/support-status";
import {
	listSupportCapabilityItems,
	summarizeSupportCapabilityItems,
} from "@/lib/support/operational-support";

export const dynamic = "force-dynamic";

const statusStyles: Record<SupportCapabilityStatusCode, string> = {
	ready: "border-emerald-200 bg-emerald-50 text-emerald-700",
	warning: "border-amber-200 bg-amber-50 text-amber-700",
	missing: "border-rose-200 bg-rose-50 text-rose-700",
};

const dateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
	dateStyle: "short",
	timeStyle: "short",
});

function formatDateTime(value: string) {
	return dateTimeFormatter.format(new Date(value));
}

export default function AdminSupportPage() {
	const capabilities = listSupportCapabilityItems();
	const summary = summarizeSupportCapabilityItems(capabilities);

	return (
		<PageTransition>
			<div className="space-y-6">
				<section className="glass-card rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur">
					<p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
						M7 - Soporte transversal
					</p>
					<h1 className="text-3xl font-bold text-slate-900">
						Soporte tecnico y compatibilidad
					</h1>
					<p className="mt-2 max-w-3xl text-sm text-slate-600">
						Inventario administrativo de capacidades que mantienen la
						aplicacion usable en navegadores modernos, dispositivos moviles y
						escenarios de conectividad irregular.
					</p>
					<Link
						href="/admin"
						className="mt-4 inline-flex w-fit rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-white"
					>
						Volver al panel
					</Link>
				</section>

				<section className="grid gap-4 md:grid-cols-4">
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">Capacidades</p>
						<p className="mt-2 text-3xl font-semibold text-slate-900">
							{summary.total}
						</p>
					</div>
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">Disponibles</p>
						<p className="mt-2 text-3xl font-semibold text-emerald-700">
							{summary.ready}
						</p>
					</div>
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">A revisar</p>
						<p className="mt-2 text-3xl font-semibold text-amber-700">
							{summary.warning}
						</p>
					</div>
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">No disponibles</p>
						<p className="mt-2 text-3xl font-semibold text-rose-700">
							{summary.missing}
						</p>
					</div>
				</section>

				<section className="glass-card rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur">
					<div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
						<div>
							<h2 className="text-xl font-semibold text-slate-900">
								Estado de soporte
							</h2>
							<p className="mt-1 text-sm text-slate-600">
								Ultima lectura: {formatDateTime(summary.lastCheckedAt)}
							</p>
						</div>
						<p className="text-xs text-slate-500">
							Datos calculados desde configuracion Next.js, activos publicos y
							componentes transversales.
						</p>
					</div>

					<div className="grid gap-4 xl:grid-cols-2">
						{capabilities.map((capability) => (
							<article
								key={capability.slug}
								className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
							>
								<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
									<div>
										<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
											{capability.category}
										</p>
										<h3 className="mt-1 text-lg font-semibold text-slate-900">
											{capability.title}
										</h3>
									</div>
									<span
										className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[capability.status]}`}
									>
										{capability.statusLabel}
									</span>
								</div>

								<p className="mt-4 text-sm text-slate-600">
									{capability.description}
								</p>

								<div className="mt-4 grid gap-3">
									<div className="rounded-2xl bg-slate-50 px-4 py-3">
										<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
											Uso operativo
										</p>
										<p className="mt-1 text-sm text-slate-700">
											{capability.operationalUse}
										</p>
									</div>
									<div className="rounded-2xl bg-slate-50 px-4 py-3">
										<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
											Degradacion controlada
										</p>
										<p className="mt-1 text-sm text-slate-700">
											{capability.degradationBehavior}
										</p>
									</div>
								</div>

								<div className="mt-4 rounded-2xl border border-slate-200">
									{capability.evidence.map((item) => (
										<div
											key={`${capability.slug}-${item.label}`}
											className="flex flex-col gap-1 border-b border-slate-100 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
										>
											<span className="text-sm font-medium text-slate-600">
												{item.label}
											</span>
											<span className="break-all text-sm text-slate-500">
												{item.value}
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
