import PageTransition from "@/app/components/animations/PageTransition";
import H1Title from "@/app/components/H1Title";
import Link from "next/link";
import { getDataSource } from "@/lib/typeorm/data-source";
import { UserAccessLog } from "@/lib/typeorm/entities/UserAccessLog";
import { UserManagementLog } from "@/lib/typeorm/entities/UserManagementLog";

function formatDateTime(value: Date | null) {
	if (!value) {
		return "Sin fecha";
	}

	return new Intl.DateTimeFormat("es-ES", {
		dateStyle: "short",
		timeStyle: "short",
	}).format(value);
}

function formatUserLabel(user: { name?: string | null; email?: string | null } | null) {
	if (!user) {
		return "Usuario no disponible";
	}

	return user.name || user.email || "Usuario sin nombre";
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
			<div className="space-y-6">
				<H1Title
					title="Auditoría"
					subtitle="Accesos, sesiones y acciones administrativas"
				/>

				<section className="grid grid-cols-3 gap-2 md:gap-4">
					<div className="glass-card rounded-2xl border border-white/30 bg-white/80 p-3 text-center shadow-lg backdrop-blur md:rounded-3xl md:p-5 md:text-left">
						<p className="text-[0.65rem] leading-tight text-slate-500 md:text-sm">
							Sesiones activas
						</p>
						<p className="mt-1 text-xl font-semibold text-slate-900 md:mt-2 md:text-3xl">
							{activeSessions}
						</p>
					</div>

					<div className="glass-card rounded-2xl border border-white/30 bg-white/80 p-3 text-center shadow-lg backdrop-blur md:rounded-3xl md:p-5 md:text-left">
						<p className="text-[0.65rem] leading-tight text-slate-500 md:text-sm">
							Accesos listados
						</p>
						<p className="mt-1 text-xl font-semibold text-slate-900 md:mt-2 md:text-3xl">
							{accessLogs.length}
						</p>
					</div>

					<div className="glass-card rounded-2xl border border-white/30 bg-white/80 p-3 text-center shadow-lg backdrop-blur md:rounded-3xl md:p-5 md:text-left">
						<p className="text-[0.65rem] leading-tight text-slate-500 md:text-sm">
							Acciones listadas
						</p>
						<p className="mt-1 text-xl font-semibold text-slate-900 md:mt-2 md:text-3xl">
							{managementLogs.length}
						</p>
					</div>
				</section>

				<section className="glass-card rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur">
					<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<h2 className="text-xl font-semibold text-slate-900">
								Accesos recientes
							</h2>
							<p className="mt-1 text-sm text-slate-600">
								Se muestran los últimos eventos de acceso registrados por el
								sistema.
							</p>
						</div>
						<Link
							href="/api/admin/audit/export?type=access&days=30&limit=200"
							className="inline-flex justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
						>
							Exportar accesos CSV
						</Link>
					</div>

					<details className="group rounded-2xl border border-slate-200 bg-white/70 p-3">
						<summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
							<span>Ver accesos recientes</span>
							<span className="text-xs uppercase tracking-[0.18em] text-slate-500 group-open:hidden">
								Mostrar
							</span>
							<span className="hidden text-xs uppercase tracking-[0.18em] text-slate-500 group-open:inline">
								Ocultar
							</span>
						</summary>

						<div className="mt-3 space-y-3">
							{accessLogs.map((log) => (
								<div
									key={log.id}
									className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
								>
									<div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
										<div>
											<p className="text-sm font-semibold text-slate-900">
												{log.eventType?.name ?? "Evento"} -{" "}
												{log.resultType?.name ?? "Resultado"}
											</p>
											<p className="mt-1 text-sm text-slate-600">
												{formatUserLabel(log.user ?? null)}
											</p>
											<p className="mt-1 text-xs text-slate-500">
												{log.email_attempted || "Sin correo registrado"}
											</p>
										</div>

										<div className="text-sm text-slate-500">
											{formatDateTime(log.created_at)}
										</div>
									</div>

									<div className="mt-3 flex flex-wrap gap-2 text-xs">
										<span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
											Sesión: {log.session_token ? "persistida" : "sin token"}
										</span>

										{log.revoked_at ? (
											<span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
												Revocada: {formatDateTime(log.revoked_at)}
											</span>
										) : null}

										{log.failure_reason ? (
											<span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-rose-700">
												{log.failure_reason}
											</span>
										) : null}
									</div>
								</div>
							))}
						</div>
					</details>
				</section>

				<section className="glass-card rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur">
					<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
						<div>
							<h2 className="text-xl font-semibold text-slate-900">
								Acciones administrativas recientes
							</h2>
							<p className="mt-1 text-sm text-slate-600">
								Se muestran los últimos cambios aplicados por usuarios con
								privilegios administrativos.
							</p>
						</div>
						<Link
							href="/api/admin/audit/export?type=management&days=30&limit=200"
							className="inline-flex justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
						>
							Exportar acciones CSV
						</Link>
					</div>

					<details className="group rounded-2xl border border-slate-200 bg-white/70 p-3">
						<summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-xl px-2 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
							<span>Ver acciones administrativas</span>
							<span className="text-xs uppercase tracking-[0.18em] text-slate-500 group-open:hidden">
								Mostrar
							</span>
							<span className="hidden text-xs uppercase tracking-[0.18em] text-slate-500 group-open:inline">
								Ocultar
							</span>
						</summary>

						<div className="mt-3 space-y-3">
							{managementLogs.map((log) => (
								<div
									key={log.id}
									className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
								>
									<div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
										<div>
											<p className="text-sm font-semibold text-slate-900">
												{log.actionType?.name ?? "Acción administrativa"}
											</p>
											<p className="mt-1 text-sm text-slate-600">
												Sobre {formatUserLabel(log.targetUser)}
											</p>
											<p className="mt-1 text-xs text-slate-500">
												Realizada por {formatUserLabel(log.performedByUser)}
											</p>
										</div>

										<div className="text-sm text-slate-500">
											{formatDateTime(log.created_at)}
										</div>
									</div>

									<div className="mt-3 flex flex-wrap gap-2 text-xs">
										{log.previousStatus || log.newStatus ? (
											<span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
												Estado: {log.previousStatus?.name ?? "-"} {"->"}{" "}
												{log.newStatus?.name ?? "-"}
											</span>
										) : null}

										{log.previousRole || log.newRole ? (
											<span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
												Rol: {log.previousRole?.name ?? "-"} {"->"}{" "}
												{log.newRole?.name ?? "-"}
											</span>
										) : null}

										{log.reason ? (
											<span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sky-700">
												{log.reason}
											</span>
										) : null}
									</div>

									{log.notes ? (
										<p className="mt-3 text-sm text-slate-600">{log.notes}</p>
									) : null}
								</div>
							))}
						</div>
					</details>
				</section>
			</div>
		</PageTransition>
	);
}
