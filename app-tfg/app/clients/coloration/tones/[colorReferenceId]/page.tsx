import { notFound } from "next/navigation";
import ColorReferenceDetail from "@/app/components/catalog/ColorReferenceDetail";
import {
	serializeColorReferenceDetail,
	toClientPlain,
} from "@/app/components/catalog/coloration-serializers";
import { getCatalogColorReferenceDetail } from "@/lib/typeorm/services/catalog/catalog-reader";

export default async function ClientColorReferenceDetailPage({
	params,
}: {
	params: Promise<{ colorReferenceId: string }>;
}) {
	const { colorReferenceId } = await params;
	const colorReference =
		await getCatalogColorReferenceDetail(colorReferenceId);

	if (!colorReference) {
		notFound();
	}

	return (
		<ColorReferenceDetail
			title="Tono de color"
			subtitle="Consulta el color y el tinte asociado"
			colorReference={toClientPlain(
				serializeColorReferenceDetail(colorReference),
			)}
			colorChartBasePath="/clients/coloration"
			productBasePath="/clients/catalog"
		/>
	);
}
