import CatalogProductsExplorer from "@/app/components/catalog/CatalogProductsExplorer";
import { listActiveCatalogProducts } from "@/lib/typeorm/services/catalog/catalog-reader";

export default async function CommercialCatalogPage() {
	const products = await listActiveCatalogProducts();

	return (
		<CatalogProductsExplorer
			title="Catalogo"
			subtitle="Consulta la oferta profesional disponible para tu cartera"
			products={products}
			detailBasePath="/commercials/catalog"
		/>
	);
}
