import Image from "next/image";
import Link from "next/link";
import H1Title from "@/app/components/H1Title";
import ProductOrderBox from "@/app/components/catalog/ProductOrderBox";
import { getVisibleProductReference } from "@/lib/catalog/product-reference";
import { formatDateTime } from "@/lib/utils/user-utils";
import type { listColorCharts } from "@/lib/typeorm/services/catalog/color-chart";
import type { listColorReferences } from "@/lib/typeorm/services/catalog/color-chart";
import type { getProductById } from "@/lib/typeorm/services/catalog/product";

type DetailResource = {
	id: string;
	title: string;
	description: string | null;
	resourceUrl: string;
	resourceTypeName: string | null;
	scopeLabel: string;
};

type Props = {
	title: string;
	subtitle: string;
	backHref: string;
	colorationBasePath: string;
	showPrice?: boolean;
	product: NonNullable<Awaited<ReturnType<typeof getProductById>>>;
	supportResources: DetailResource[];
	relatedColorCharts: Awaited<ReturnType<typeof listColorCharts>>;
	orderableColorReferences: Awaited<ReturnType<typeof listColorReferences>>;
	orderContext?: {
		mode: "client" | "commercial";
		draftApiBasePath: string;
		clientOptions?: Array<{
			id: string;
			name: string;
			contactName: string | null;
		}>;
	};
};

function InfoChip({
	label,
	value,
	className = "bg-white/80 text-slate-700 border border-slate-200",
}: {
	label: string;
	value: string;
	className?: string;
}) {
	return (
		<div className={`rounded-full px-4 py-2 text-sm ${className}`}>
			<span className="font-semibold">{label}:</span> {value}
		</div>
	);
}

export default function CatalogProductDetail({
	title,
	subtitle,
	backHref,
	colorationBasePath,
	showPrice = true,
	product,
	supportResources,
	relatedColorCharts,
	orderableColorReferences,
	orderContext,
}: Props) {
	const visibleReference = getVisibleProductReference(product.reference);

	return (
		<div className="space-y-6">
			<H1Title title={title} subtitle={subtitle} />

			<div className="flex flex-wrap items-center justify-between gap-3">
				<Link
					href={backHref}
					className="inline-flex rounded-full border border-slate-200 bg-white/85 px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-white"
				>
					Volver al catalogo
				</Link>

				<div className="text-sm text-slate-600">
					Actualizado el{" "}
					<span className="font-medium text-slate-900">
						{formatDateTime(product.updated_at)}
					</span>
				</div>
			</div>

			<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
				<div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
					<div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
						<div className="relative aspect-square">
							{product.image_url ? (
								<Image
									src={product.image_url}
									alt={product.name}
									fill
									className="object-cover"
									sizes="(max-width: 1024px) 100vw, 320px"
								/>
							) : (
								<div className="flex h-full items-center justify-center bg-slate-100 text-center text-sm text-slate-500">
									Imagen no disponible
								</div>
							)}
						</div>
					</div>

					<div className="space-y-5">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
								{visibleReference || "Referencia compuesta por tonos"}
							</p>

							<h2 className="mt-2 text-3xl font-bold text-slate-900">
								{product.name}
							</h2>

							<p className="mt-3 text-sm leading-7 text-slate-600">
								{product.description || "Sin descripcion comercial adicional."}
							</p>
						</div>

						<div className="flex flex-wrap gap-3">
							<InfoChip
								label="Categoria"
								value={product.productCategory?.name ?? "Sin categoria"}
								className="bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200"
							/>
							<InfoChip
								label="Linea"
								value={product.productLine?.name ?? "Sin linea"}
								className="bg-sky-100 text-sky-700 border border-sky-200"
							/>
							{product.productSubcategory?.name ? (
								<InfoChip
									label="Subcategoria"
									value={product.productSubcategory.name}
									className="bg-violet-100 text-violet-700 border border-violet-200"
								/>
							) : null}
						</div>

						<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
							<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
									Formato
								</p>
								<p className="mt-2 text-lg font-semibold text-slate-900">
									{product.format || "-"}
								</p>
							</div>

							<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
									Packing
								</p>
								<p className="mt-2 text-lg font-semibold text-slate-900">
									{product.packing ?? "-"}
								</p>
							</div>

							{showPrice ? (
								<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
									<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
										Precio base
									</p>
									<p className="mt-2 text-lg font-semibold text-slate-900">
										{product.base_price} EUR
									</p>
								</div>
							) : null}

							<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:col-span-2 xl:col-span-3">
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
									Proveedor
								</p>
								<p className="mt-2 text-base font-medium text-slate-900">
									{product.supplier || "Sin proveedor especificado"}
								</p>
							</div>
						</div>
					</div>
				</div>
			</section>

			{orderContext ? (
				<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
					<ProductOrderBox
						mode={orderContext.mode}
						draftApiBasePath={orderContext.draftApiBasePath}
						productId={product.id}
						productName={product.name}
						productLineName={product.productLine?.name ?? null}
						orderableColorReferences={orderableColorReferences.map((reference) => ({
							id: reference.id,
							code: reference.code,
							name: reference.name,
							erpReference: reference.erp_reference ?? null,
						}))}
						clientOptions={orderContext.clientOptions ?? []}
					/>
				</section>
			) : null}

			<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
				<div className="flex flex-col gap-2">
					<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
						Informacion tecnica
					</p>
					<h3 className="text-2xl font-semibold text-slate-900">
						Modo de uso y caracteristicas
					</h3>
					<p className="whitespace-pre-line text-sm leading-7 text-slate-600">
						{product.technical_info ||
							"Este producto todavia no tiene informacion tecnica registrada."}
					</p>
				</div>
			</section>

			<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
				<div className="flex flex-col gap-2">
					<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
						Recursos de apoyo
					</p>
					<h3 className="text-2xl font-semibold text-slate-900">
						Fichas, catalogos y materiales vinculados
					</h3>
				</div>

				{supportResources.length === 0 ? (
					<div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-6 text-sm text-slate-500">
						No hay recursos asociados a este producto ni a su linea comercial.
					</div>
				) : (
					<div className="mt-5 grid gap-4 lg:grid-cols-2">
						{supportResources.map((resource) => (
							<a
								key={resource.id}
								href={resource.resourceUrl}
								target="_blank"
								rel="noreferrer"
								className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
							>
								<div className="flex flex-wrap gap-2">
									<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
										{resource.resourceTypeName || "Recurso"}
									</span>
									<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
										{resource.scopeLabel}
									</span>
								</div>

								<h4 className="mt-4 text-lg font-semibold text-slate-900">
									{resource.title}
								</h4>

								<p className="mt-2 text-sm leading-6 text-slate-600">
									{resource.description || "Abrir recurso externo"}
								</p>
							</a>
						))}
					</div>
				)}
			</section>

			{orderableColorReferences.length > 0 ? (
				<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
					<div className="flex flex-col gap-2">
						<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
							Coloración relacionada
						</p>
						<h3 className="text-2xl font-semibold text-slate-900">
							Referencias exactas disponibles
						</h3>
						<p className="text-sm leading-7 text-slate-600">
							Estas son las referencias concretas que se pueden pedir para este
							tinte. El pedido se registra por código exacto, no por el producto
							genérico.
						</p>
					</div>

					<div className="mt-5 grid gap-4 lg:grid-cols-2">
						{orderableColorReferences.map((reference) => (
							<article
								key={reference.id}
								className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
							>
								<div className="flex flex-wrap gap-2">
									<span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
										{reference.erp_reference ?? reference.code}
									</span>
									{reference.erp_reference &&
									reference.erp_reference !== reference.code ? (
										<span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
											Tono {reference.code}
										</span>
									) : null}
								</div>

								<h4 className="mt-4 text-lg font-semibold text-slate-900">
									{reference.name}
								</h4>

								<p className="mt-2 text-sm leading-6 text-slate-600">
									{reference.description ||
										"Referencia disponible para pedido y consulta comercial."}
								</p>
							</article>
						))}
					</div>
				</section>
			) : null}

			{relatedColorCharts.length > 0 ? (
				<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
					<div className="flex flex-col gap-2">
						<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
							Coloracion relacionada
						</p>
						<h3 className="text-2xl font-semibold text-slate-900">
							Cartas de color de esta linea
						</h3>
					</div>

					<div className="mt-5 grid gap-4 lg:grid-cols-2">
						{relatedColorCharts.map((colorChart) => (
							<Link
								key={colorChart.id}
								href={`${colorationBasePath}/${colorChart.id}`}
								className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
							>
								<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
									{colorChart.productLine?.name ?? "Linea cromatica"}
								</p>
								<h4 className="mt-3 text-lg font-semibold text-slate-900">
									{colorChart.name}
								</h4>
								<p className="mt-2 text-sm leading-6 text-slate-600">
									{colorChart.description ||
										"Abre esta carta para consultar sus referencias cromaticas."}
								</p>
							</Link>
						))}
					</div>
				</section>
			) : null}
		</div>
	);
}
