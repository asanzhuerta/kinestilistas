import { IsNull, MoreThanOrEqual, Not } from "typeorm";
import type {
	AdminOperationalOverview,
	AdminOperationalSection,
	AdminOperationalStatusCode,
} from "@/lib/contracts/admin-operational-overview";
import {
	listIntegrationStatusItems,
	summarizeIntegrationStatusItems,
} from "@/lib/integrations/operational-status";
import { getEnterpriseOperationsSnapshot } from "@/lib/typeorm/services/admin/enterprise-operations";
import {
	listSupportCapabilityItems,
	summarizeSupportCapabilityItems,
} from "@/lib/support/operational-support";
import { getDataSource } from "@/lib/typeorm/data-source";
import { UserAccessLog } from "@/lib/typeorm/entities/UserAccessLog";
import { UserManagementLog } from "@/lib/typeorm/entities/UserManagementLog";
import { listRateLimitPolicySettings } from "@/lib/typeorm/services/security/rate-limit-policy";

const RECENT_WINDOW_HOURS = 24;

function getStatusLabel(status: AdminOperationalStatusCode) {
	if (status === "ready") {
		return "Operativo";
	}

	if (status === "warning") {
		return "Revisar";
	}

	return "Atencion";
}

function buildSection(
	input: Omit<AdminOperationalSection, "statusLabel" | "lastCheckedAt">,
	lastCheckedAt: string,
): AdminOperationalSection {
	return {
		...input,
		statusLabel: getStatusLabel(input.status),
		lastCheckedAt,
	};
}

function summarizeSections(sections: AdminOperationalSection[]) {
	const lastCheckedAt = sections[0]?.lastCheckedAt ?? new Date().toISOString();

	return {
		total: sections.length,
		ready: sections.filter((section) => section.status === "ready").length,
		warning: sections.filter((section) => section.status === "warning").length,
		attention: sections.filter((section) => section.status === "attention")
			.length,
		lastCheckedAt,
	};
}

export async function getAdminOperationalOverview(
	now = new Date(),
): Promise<AdminOperationalOverview> {
	const lastCheckedAt = now.toISOString();
	const recentSince = new Date(
		now.getTime() - RECENT_WINDOW_HOURS * 60 * 60 * 1000,
	);
	const dataSource = await getDataSource();
	const accessLogRepo = dataSource.getRepository(UserAccessLog);
	const managementLogRepo = dataSource.getRepository(UserManagementLog);

	const [
		recentAccessLogs,
		recentFailedAccessLogs,
		recentManagementLogs,
		activeSessionsRaw,
		rateLimitPolicies,
		enterpriseOperations,
	] = await Promise.all([
		accessLogRepo.count({
			where: {
				created_at: MoreThanOrEqual(recentSince),
			},
		}),
		accessLogRepo.count({
			where: {
				created_at: MoreThanOrEqual(recentSince),
				failure_reason: Not(IsNull()),
			},
		}),
		managementLogRepo.count({
			where: {
				created_at: MoreThanOrEqual(recentSince),
			},
		}),
		accessLogRepo
			.createQueryBuilder("log")
			.select("COUNT(DISTINCT log.session_token)", "count")
			.where("log.session_token IS NOT NULL")
			.andWhere("log.revoked_at IS NULL")
			.getRawOne<{ count: string }>(),
		listRateLimitPolicySettings(),
		getEnterpriseOperationsSnapshot(now),
	]);

	const activeSessions = Number(activeSessionsRaw?.count ?? 0);
	const disabledRateLimitPolicies = rateLimitPolicies.filter(
		(policy) => !policy.enabled,
	);
	const customizedRateLimitPolicies = rateLimitPolicies.filter(
		(policy) => !policy.isDefault,
	);
	const integrationItems = listIntegrationStatusItems(now);
	const integrationSummary = summarizeIntegrationStatusItems(integrationItems);
	const supportItems = listSupportCapabilityItems(now);
	const supportSummary = summarizeSupportCapabilityItems(supportItems);

	const sections = [
		buildSection(
			{
				slug: "audit-traceability",
				title: "Auditoría y trazabilidad",
				href: "/admin/audit",
				status: "ready",
				description:
					"Consulta de accesos recientes, sesiones activas y acciones administrativas sobre usuarios.",
				metrics: [
					{
						label: "Sesiones activas",
						value: String(activeSessions),
					},
					{
						label: "Accesos 24 h",
						value: String(recentAccessLogs),
					},
					{
						label: "Fallos 24 h",
						value: String(recentFailedAccessLogs),
					},
					{
						label: "Acciones admin 24 h",
						value: String(recentManagementLogs),
					},
				],
			},
			lastCheckedAt,
		),
		buildSection(
			{
				slug: "rate-limit-settings",
				title: "Limitación global de peticiones",
				href: "/admin/settings",
				status:
					rateLimitPolicies.length === 0
						? "attention"
						: disabledRateLimitPolicies.length > 0
							? "warning"
							: "ready",
				description:
					"Políticas persistidas que protegen el inicio de sesión y la API frente a abuso operativo sin redesplegar la aplicación.",
				metrics: [
					{
						label: "Políticas",
						value: String(rateLimitPolicies.length),
					},
					{
						label: "Activas",
						value: String(
							rateLimitPolicies.filter((policy) => policy.enabled).length,
						),
					},
					{
						label: "Personalizadas",
						value: String(customizedRateLimitPolicies.length),
					},
					{
						label: "Desactivadas",
						value: String(disabledRateLimitPolicies.length),
					},
				],
			},
			lastCheckedAt,
		),
		buildSection(
			{
				slug: "integration-inventory",
				title: "Integraciones de soporte",
				href: "/admin/integrations",
				status:
					integrationSummary.notConfigured > 0
						? "attention"
						: integrationSummary.degraded > 0
							? "warning"
							: "ready",
				description:
					"Inventario de proveedores externos usados por catálogo, rutas, imágenes y QR.",
				metrics: [
					{
						label: "Integraciones",
						value: String(integrationSummary.total),
					},
					{
						label: "Operativas",
						value: String(integrationSummary.operational),
					},
					{
						label: "A revisar",
						value: String(integrationSummary.degraded),
					},
					{
						label: "Sin configurar",
						value: String(integrationSummary.notConfigured),
					},
				],
			},
			lastCheckedAt,
		),
		buildSection(
			{
				slug: "support-capabilities",
				title: "Soporte técnico y PWA",
				href: "/admin/support",
				status:
					supportSummary.missing > 0
						? "attention"
						: supportSummary.warning > 0
							? "warning"
							: "ready",
				description:
					"Compatibilidad de navegador, instalacion PWA, service worker y protecciones de experiencia.",
				metrics: [
					{
						label: "Capacidades",
						value: String(supportSummary.total),
					},
					{
						label: "Disponibles",
						value: String(supportSummary.ready),
					},
					{
						label: "A revisar",
						value: String(supportSummary.warning),
					},
					{
						label: "No disponibles",
						value: String(supportSummary.missing),
					},
				],
			},
			lastCheckedAt,
		),
		buildSection(
			{
				slug: "enterprise-operations",
				title: "Operaciones empresariales",
				href: "/admin/enterprise-operations",
				status:
					enterpriseOperations.summary.failedOperations > 0
						? "warning"
						: enterpriseOperations.summary.integrations === 0
							? "attention"
							: "ready",
				description:
					"Registro persistente de configuración, integraciones externas, operaciones de intercambio y propuestas de pedido a proveedor.",
				metrics: [
					{
						label: "Configuraciones",
						value: String(enterpriseOperations.summary.configurations),
					},
					{
						label: "Integraciones",
						value: String(enterpriseOperations.summary.integrations),
					},
					{
						label: "Operaciones",
						value: String(enterpriseOperations.summary.operations),
						helper: `${enterpriseOperations.summary.successfulOperations} correctas / ${enterpriseOperations.summary.failedOperations} fallidas`,
					},
					{
						label: "Propuestas abiertas",
						value: String(enterpriseOperations.summary.openProposals),
						helper: `${enterpriseOperations.summary.proposalUnits} uds. estimadas`,
					},
				],
			},
			lastCheckedAt,
		),
	] satisfies AdminOperationalSection[];

	return {
		summary: summarizeSections(sections),
		sections,
	};
}
