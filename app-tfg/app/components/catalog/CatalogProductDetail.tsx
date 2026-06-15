import Image from "next/image";
import Link from "next/link";
import H1Title from "@/app/components/H1Title";
import ProductOrderBox from "@/app/components/catalog/ProductOrderBox";
import { getVisibleProductReference } from "@/lib/catalog/product-reference";
import {
	getCloudinaryAttachmentDownloadUrl,
	isPdfResourceUrl,
	sanitizeDownloadFileName,
} from "@/lib/cloudinary-url";
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

function InfoBadge({
	value,
	className = "bg-white/80 text-slate-700 border border-slate-200",
}: {
	value: string;
	className?: string;
}) {
	return (
		<div
			className={`rounded-full px-4 py-2 text-sm font-black uppercase tracking-[0.08em] ${className}`}
		>
			{value}
		</div>
	);
}

function TaxonomyDescription({
	label,
	description,
}: {
	label: string;
	description: string | null | undefined;
}) {
	if (!description) {
		return null;
	}

	return (
		<div className="rounded-2xl border border-white/60 bg-white/55 px-4 py-3 shadow-sm">
			<p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">
				{label}
			</p>
			<p className="mt-1 text-sm leading-6 text-slate-700">{description}</p>
		</div>
	);
}

function TechnicalInfoPanel({
	product,
}: {
	product: NonNullable<Awaited<ReturnType<typeof getProductById>>>;
}) {
	return (
		<section className="rounded-3xl border border-white/50 bg-white/70 p-5 shadow-sm">
			<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
				Información técnica
			</p>
			<h3 className="mt-2 text-xl font-semibold text-slate-900">
				Modo de uso y características
			</h3>
			<p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-600">
				{product.technical_info ||
					"Este producto todavía no tiene información técnica registrada."}
			</p>
		</section>
	);
}

function SupportResourcesPanel({
	supportResources,
}: {
	supportResources: DetailResource[];
}) {
	return (
		<section className="rounded-3xl border border-white/50 bg-white/70 p-5 shadow-sm">
			<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
				Recursos de apoyo
			</p>
			<h3 className="mt-2 text-xl font-semibold text-slate-900">
				Fichas, catálogos y materiales
			</h3>

			{supportResources.length === 0 ? (
				<div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-4 py-5 text-sm text-slate-500">
					No hay recursos asociados a este producto ni a su línea comercial.
				</div>
			) : (
				<div className="mt-4 space-y-3">
					{supportResources.map((resource) => {
						const isPdf = isPdfResourceUrl(resource.resourceUrl);
						const downloadName = sanitizeDownloadFileName(
							`${resource.title}.pdf`,
							"recurso.pdf",
							{ ensurePdfExtension: true },
						);
						const href = isPdf
							? getCloudinaryAttachmentDownloadUrl(
									resource.resourceUrl,
									downloadName,
								)
							: resource.resourceUrl;

						return (
							<a
								key={resource.id}
								href={href}
								target={isPdf ? undefined : "_blank"}
								rel={isPdf ? undefined : "noreferrer"}
								download={isPdf ? downloadName : undefined}
								className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
							>
								<div className="flex flex-wrap gap-2">
									<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
										{resource.resourceTypeName || "Recurso"}
									</span>
									<span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
										{resource.scopeLabel}
									</span>
								</div>

								<h4 className="mt-3 text-base font-semibold text-slate-900">
									{resource.title}
								</h4>

								<p className="mt-2 text-sm leading-6 text-slate-600">
									{resource.description ||
										(isPdf ? "Descargar PDF" : "Abrir recurso externo")}
								</p>
							</a>
						);
					})}
				</div>
			)}
		</section>
	);
}

export default function CatalogProductDetail({
	title,
	subtitle,
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

			<div className="flex justify-end">
				<div className="text-sm text-slate-600">
					Actualizado el{" "}
					<span className="font-medium text-slate-900">
						{formatDateTime(product.updated_at)}
					</span>
				</div>
			</div>

			<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-5 shadow-xl backdrop-blur lg:p-6">
				<div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)_minmax(320px,0.82fr)] 2xl:grid-cols-[360px_minmax(0,1fr)_minmax(360px,0.85fr)]">
					<div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
						<div className="relative aspect-square">
							{product.image_url ? (
								<Image
									src={product.image_url}
									alt={product.name}
									fill
									className="object-contain p-4"
									sizes="(max-width: 1024px) 100vw, 360px"
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
								{product.description || "Sin descripción comercial adicional."}
							</p>
						</div>

						<div className="flex flex-wrap gap-3">
							<InfoBadge
								value={product.productCategory?.name ?? "Sin categoría"}
								className="bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200"
							/>
							<InfoBadge
								value={product.productLine?.name ?? "Sin línea"}
								className="bg-sky-100 text-sky-700 border border-sky-200"
							/>
							{product.productSubcategory?.name ? (
								<InfoBadge
									value={product.productSubcategory.name}
									className="bg-violet-100 text-violet-700 border border-violet-200"
								/>
							) : null}
						</div>

						<div className="grid gap-3">
							<TaxonomyDescription
								label="Categoría"
								description={product.productCategory?.description}
							/>
							<TaxonomyDescription
								label="Línea"
								description={product.productLine?.description}
							/>
							<TaxonomyDescription
								label="Subcategoría"
								description={product.productSubcategory?.description}
							/>
						</div>

						<div className="grid gap-3 sm:grid-cols-2">
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
						</div>
					</div>

					<div className="space-y-4">
						<TechnicalInfoPanel product={product} />
						<SupportResourcesPanel supportResources={supportResources} />
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
							Coloración relacionada
						</p>
						<h3 className="text-2xl font-semibold text-slate-900">
							Cartas de color de esta línea
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
									{colorChart.productLine?.name ?? "Línea cromática"}
								</p>
								<h4 className="mt-3 text-lg font-semibold text-slate-900">
									{colorChart.name}
								</h4>
								<p className="mt-2 text-sm leading-6 text-slate-600">
									{colorChart.description ||
										"Abre esta carta para consultar sus referencias cromáticas."}
								</p>
							</Link>
						))}
					</div>
				</section>
			) : null}
		</div>
	);
}
