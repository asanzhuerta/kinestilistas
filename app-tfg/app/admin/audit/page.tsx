import PageTransition from "@/app/components/animations/PageTransition";
import Link from "next/link";
import { getDataSource } from "@/lib/typeorm/data-source";
import { UserAccessLog } from "@/lib/typeorm/entities/UserAccessLog";
import { UserManagementLog } from "@/lib/typeorm/entities/UserManagementLog";

const dateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
	dateStyle: "short",
	timeStyle: "short",
});

function formatDateTime(value: Date | null) {
	if (!value) {
		return "Sin fecha";
	}

	return dateTimeFormatter.format(value);
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
				<section className="glass-card rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur">
					<div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
						<div>
							<p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
								M7 - Auditoria y trazabilidad
							</p>
							<h1 className="text-3xl font-bold text-slate-900">Auditoria</h1>
							<p className="mt-2 max-w-3xl text-sm text-slate-600">
								Aqui puedes revisar los accesos recientes, las acciones
								administrativas sobre usuarios y una referencia rapida de las
								sesiones que siguen activas.
							</p>
						</div>

						<div className="flex flex-wrap gap-3">
							<Link
								href="/api/admin/audit/export?type=access&days=30&limit=200"
								className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
							>
								Exportar accesos CSV
							</Link>
							<Link
								href="/api/admin/audit/export?type=management&days=30&limit=200"
								className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
							>
								Exportar acciones CSV
							</Link>
						</div>
					</div>
				</section>

				<section className="grid gap-4 md:grid-cols-3">
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">Sesiones activas</p>
						<p className="mt-2 text-3xl font-semibold text-slate-900">
							{activeSessions}
						</p>
					</div>

					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">Accesos listados</p>
						<p className="mt-2 text-3xl font-semibold text-slate-900">
							{accessLogs.length}
						</p>
					</div>

					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">Acciones listadas</p>
						<p className="mt-2 text-3xl font-semibold text-slate-900">
							{managementLogs.length}
						</p>
					</div>
				</section>

				<section className="glass-card rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur">
					<div className="mb-4">
						<h2 className="text-xl font-semibold text-slate-900">
							Accesos recientes
						</h2>
						<p className="mt-1 text-sm text-slate-600">
							Se muestran los ultimos eventos de acceso registrados por el
							sistema.
						</p>
					</div>

					<div className="space-y-3">
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
										Sesion: {log.session_token ? "persistida" : "sin token"}
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
				</section>

				<section className="glass-card rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur">
					<div className="mb-4">
						<h2 className="text-xl font-semibold text-slate-900">
							Acciones administrativas recientes
						</h2>
						<p className="mt-1 text-sm text-slate-600">
							Se muestran los ultimos cambios aplicados por usuarios con
							privilegios administrativos.
						</p>
					</div>

					<div className="space-y-3">
						{managementLogs.map((log) => (
							<div
								key={log.id}
								className="rounded-2xl border border-slate-200 bg-white px-4 py-4"
							>
								<div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
									<div>
										<p className="text-sm font-semibold text-slate-900">
											{log.actionType?.name ?? "Accion administrativa"}
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
				</section>
			</div>
		</PageTransition>
	);
}
