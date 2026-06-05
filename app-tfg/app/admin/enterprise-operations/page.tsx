import AdminEnterpriseOperationsWorkspace from "@/app/components/admin/AdminEnterpriseOperationsWorkspace";
import { requireAdminSession } from "@/lib/auth/require-session";
import { PRODUCT_STATUS_IDS } from "@/lib/typeorm/constants/catalog-ids";
import { getEnterpriseOperationsSnapshot } from "@/lib/typeorm/services/admin/enterprise-operations";
import { listProducts } from "@/lib/typeorm/services/catalog/product";

export const dynamic = "force-dynamic";

export default async function AdminEnterpriseOperationsPage() {
	await requireAdminSession();

	const [snapshot, products] = await Promise.all([
		getEnterpriseOperationsSnapshot(),
		listProducts({
			statusId: PRODUCT_STATUS_IDS.ACTIVE,
		}),
	]);

	return (
		<AdminEnterpriseOperationsWorkspace
			initialSnapshot={snapshot}
			productOptions={products.map((product) => ({
				id: product.id,
				name: product.name,
				reference: product.reference,
			}))}
		/>
	);
}
