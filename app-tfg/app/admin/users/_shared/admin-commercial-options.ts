import { requestJson } from "@/lib/api/client";
import type { CommercialSummary } from "@/lib/contracts/commercial-client";

export type AdminCommercialOption = CommercialSummary;

export async function fetchAdminCommercialOptions() {
	const data = await requestJson<AdminCommercialOption[]>("/api/admin/commercials", {
		method: "GET",
		cache: "no-store",
		fallbackMessage: "No se pudieron cargar los comerciales",
	});

	return Array.isArray(data) ? (data as AdminCommercialOption[]) : [];
}

export function getAdminCommercialLabel(commercial: AdminCommercialOption) {
	const name = commercial.user?.name?.trim() || "Comercial sin nombre";
	const email = commercial.user?.email?.trim();
	const territory = commercial.territory?.trim();
	const employeeCode = commercial.employee_code?.trim();

	const parts = [name];

	if (employeeCode) parts.push(`Cod: ${employeeCode}`);
	if (territory) parts.push(`Zona: ${territory}`);
	if (email) parts.push(email);

	return parts.join(" · ");
}
