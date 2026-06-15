import type { ReactNode } from "react";
import Link from "next/link";
import PageTransition from "@/app/components/animations/PageTransition";
import H1Title from "@/app/components/H1Title";
import { getDataSource } from "@/lib/typeorm/data-source";
import { UserAccessLog } from "@/lib/typeorm/entities/UserAccessLog";
import { UserManagementLog } from "@/lib/typeorm/entities/UserManagementLog";

const auditDateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
	dateStyle: "short",
	timeStyle: "short",
});

function formatDateTime(value: Date | null) {
	if (!value) {
		return "Sin fecha";
	}

	return auditDateTimeFormatter.format(value);
}

function formatUserLabel(user: { name?: string | null; email?: string | null } | null) {
	if (!user) {
		return "Usuario no disponible";
	}

	return user.name || user.email || "Usuario sin nombre";
}

function SummaryPill({ label, value }: { label: string; value: number }) {
	return (
		<span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800">
			<span className="text-slate-500">{label}</span>
			<span className="text-slate-950">{value}</span>
		</span>
	);
}

function AuditChip({
	children,
	tone = "slate",
}: {
	children: ReactNode;
	tone?: "slate" | "amber" | "rose" | "sky";
}) {
	const toneClass = {
		amber: "border-amber-200 bg-amber-50 text-amber-700",
		rose: "border-rose-200 bg-rose-50 text-rose-700",
		sky: "border-sky-200 bg-sky-50 text-sky-700",
		slate: "border-slate-200 bg-slate-50 text-slate-600",
	}[tone];

	return (
		<span className={`rounded-full border px-3 py-1 text-xs font-medium ${toneClass}`}>
			{children}
		</span>
	);
}

function EmptyAuditState({ children }: { children: ReactNode }) {
	return (
		<div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-6 text-sm text-slate-600">
			{children}
		</div>
	);
}

export default async function AdminAuditPage() {
	const ds = await getDataSource();
	const accessLogRepo = ds.getRepository(UserAccessLog);
	const managementLogRepo = ds.getRepository(UserManagementLog);

	const [accessLogs, managementLogs, activeSessionsRaw] = await Promise.all([
		accessLogRepo.find({
			relations: {
				user: true,
				eventType: true,
				resultType: true,
			},
			order: {
				created_at: "DESC",
			},
			take: 12,
		}),
		managementLogRepo.find({
			relations: {
				targetUser: true,
				performedByUser: true,
				actionType: true,
				previousStatus: true,
				newStatus: true,
				previousRole: true,
				newRole: true,
			},
			order: {
				created_at: "DESC",
			},
			take: 12,
		}),
		accessLogRepo
			.createQueryBuilder("log")
			.select("COUNT(DISTINCT log.session_token)", "count")
			.where("log.session_token IS NOT NULL")
			.andWhere("log.revoked_at IS NULL")
			.getRawOne<{ count: string }>(),
	]);

	const activeSessions = Number(activeSessionsRaw?.count ?? 0);

	return (
		<PageTransition>
			<div className="space-y-5">
				<H1Title
					title="Auditoría"
					subtitle="Accesos y cambios administrativos"
				/>

				<section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
					<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
						<div className="flex flex-wrap items-center gap-2">
							<span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
								Resumen
							</span>
							<SummaryPill label="Sesiones activas" value={activeSessions} />
							<SummaryPill label="Accesos" value={accessLogs.length} />
							<SummaryPill label="Acciones" value={managementLogs.length} />
						</div>

						<div className="flex flex-wrap gap-2">
							<Link
								href="/api/admin/audit/export?type=access&days=30&limit=200"
								className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
							>
								Exportar accesos
							</Link>
							<Link
								href="/api/admin/audit/export?type=management&days=30&limit=200"
								className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
							>
								Exportar acciones
							</Link>
						</div>
					</div>
				</section>

				<section className="grid gap-4 xl:grid-cols-2">
					<article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
									Accesos
								</p>
								<h2 className="mt-1 text-xl font-semibold text-slate-900">
									Últimos accesos
								</h2>
							</div>
							<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
								{accessLogs.length}
							</span>
						</div>

						<div className="mt-4 space-y-3">
							{accessLogs.length === 0 ? (
								<EmptyAuditState>No hay accesos registrados.</EmptyAuditState>
							) : (
								accessLogs.map((log) => (
									<div
										key={log.id}
										className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3"
									>
										<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
											<div className="min-w-0">
												<p className="text-sm font-semibold text-slate-900">
													{log.eventType?.name ?? "Evento"} ·{" "}
													{log.resultType?.name ?? "Resultado"}
												</p>
												<p className="mt-1 text-sm text-slate-600">
													{formatUserLabel(log.user ?? null)}
												</p>
												<p className="mt-1 truncate text-xs text-slate-500">
													{log.email_attempted || "Sin correo registrado"}
												</p>
											</div>

											<p className="shrink-0 text-xs font-semibold text-slate-500 sm:text-right">
												{formatDateTime(log.created_at)}
											</p>
										</div>

										<div className="mt-3 flex flex-wrap gap-2">
											<AuditChip>
												Sesión: {log.session_token ? "persistida" : "sin token"}
											</AuditChip>

											{log.revoked_at ? (
												<AuditChip tone="amber">
													Revocada: {formatDateTime(log.revoked_at)}
												</AuditChip>
											) : null}

											{log.failure_reason ? (
												<AuditChip tone="rose">{log.failure_reason}</AuditChip>
											) : null}
										</div>
									</div>
								))
							)}
						</div>
					</article>

					<article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
									Administración
								</p>
								<h2 className="mt-1 text-xl font-semibold text-slate-900">
									Últimas acciones
								</h2>
							</div>
							<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
								{managementLogs.length}
							</span>
						</div>

						<div className="mt-4 space-y-3">
							{managementLogs.length === 0 ? (
								<EmptyAuditState>
									No hay acciones administrativas registradas.
								</EmptyAuditState>
							) : (
								managementLogs.map((log) => (
									<div
										key={log.id}
										className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3"
									>
										<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
											<div className="min-w-0">
												<p className="text-sm font-semibold text-slate-900">
													{log.actionType?.name ?? "Acción administrativa"}
												</p>
												<p className="mt-1 text-sm text-slate-600">
													Sobre {formatUserLabel(log.targetUser)}
												</p>
												<p className="mt-1 text-xs text-slate-500">
													Por {formatUserLabel(log.performedByUser)}
												</p>
											</div>

											<p className="shrink-0 text-xs font-semibold text-slate-500 sm:text-right">
												{formatDateTime(log.created_at)}
											</p>
										</div>

										<div className="mt-3 flex flex-wrap gap-2">
											{log.previousStatus || log.newStatus ? (
												<AuditChip>
													Estado: {log.previousStatus?.name ?? "-"} {" -> "}
													{log.newStatus?.name ?? "-"}
												</AuditChip>
											) : null}

											{log.previousRole || log.newRole ? (
												<AuditChip>
													Rol: {log.previousRole?.name ?? "-"} {" -> "}
													{log.newRole?.name ?? "-"}
												</AuditChip>
											) : null}

											{log.reason ? (
												<AuditChip tone="sky">{log.reason}</AuditChip>
											) : null}
										</div>

										{log.notes ? (
											<p className="mt-3 text-sm leading-6 text-slate-600">
												{log.notes}
											</p>
										) : null}
									</div>
								))
							)}
						</div>
					</article>
				</section>
			</div>
		</PageTransition>
	);
}
