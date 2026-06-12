import Image from "next/image";
import Link from "next/link";
import H1Title from "@/app/components/H1Title";
import { getVisibleProductReference } from "@/lib/catalog/product-reference";
import type { SerializedColorReferenceDetail } from "./coloration-serializers";

type Props = {
	title: string;
	subtitle: string;
	colorReference: SerializedColorReferenceDetail;
	colorChartBasePath: string;
	productBasePath: string;
};

function InfoTile({
	label,
	value,
}: {
	label: string;
	value: string | number | null | undefined;
}) {
	return (
		<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
			<p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
				{label}
			</p>
			<p className="mt-2 text-base font-semibold text-slate-900">
				{value || "-"}
			</p>
		</div>
	);
}

export default function ColorReferenceDetail({
	title,
	subtitle,
	colorReference,
	colorChartBasePath,
	productBasePath,
}: Props) {
	const imageUrl = colorReference.image_url ?? colorReference.thumb_image_url;
	const product = colorReference.product;
	const visibleProductReference = product
		? getVisibleProductReference(product.reference)
		: null;

	return (
		<div className="space-y-6">
			<H1Title title={title} subtitle={subtitle} />

			<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-5 shadow-xl backdrop-blur lg:p-6">
				<div className="grid gap-5 lg:grid-cols-[minmax(240px,360px)_minmax(0,1fr)]">
					<div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 shadow-sm">
						<div className="relative aspect-square">
							{imageUrl ? (
								<Image
									src={imageUrl}
									alt={`${colorReference.code} ${colorReference.name}`}
									fill
									className="object-cover"
									sizes="(max-width: 1024px) 100vw, 360px"
								/>
							) : (
								<div className="grid h-full place-items-center bg-slate-100 px-6 text-center text-sm text-slate-500">
									Sin imagen de muestra
								</div>
							)}
							<div className="absolute inset-0 bg-gradient-to-t from-slate-950/72 via-transparent to-transparent" />
							<div className="absolute bottom-4 left-4 right-4">
								<p
									className="text-4xl font-black leading-none text-white"
									style={{
										textShadow: "0 3px 16px rgba(0, 0, 0, 0.72)",
									}}
								>
									{colorReference.code}
								</p>
								<p
									className="mt-2 text-lg font-semibold leading-tight text-white"
									style={{
										textShadow: "0 3px 16px rgba(0, 0, 0, 0.72)",
									}}
								>
									{colorReference.name}
								</p>
							</div>
						</div>
					</div>

					<div className="space-y-5">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
								{colorReference.colorChart?.productLine?.name ?? "Coloración"}
							</p>
							<h2 className="mt-2 text-3xl font-bold text-slate-950">
								{colorReference.code} · {colorReference.name}
							</h2>
							<p className="mt-3 text-sm leading-7 text-slate-600">
								{colorReference.description ||
									"Tono disponible para consulta técnica y preparación de pedidos."}
							</p>
						</div>

						<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
							<InfoTile
								label="Carta"
								value={colorReference.colorChart?.name ?? "Sin carta"}
							/>
							<InfoTile
								label="Referencia"
								value={colorReference.erp_reference ?? colorReference.code}
							/>
							<InfoTile
								label="Pedido"
								value={colorReference.is_orderable ? "Disponible" : "Consulta"}
							/>
							<InfoTile label="Orden" value={colorReference.display_order} />
						</div>

						<div className="flex flex-wrap gap-2">
							{colorReference.colorChart ? (
								<Link
									href={`${colorChartBasePath}/${colorReference.colorChart.id}`}
									className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
								>
									Abrir carta de color
								</Link>
							) : null}
							{product ? (
								<Link
									href={`${productBasePath}/${product.id}`}
									className="rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
								>
									Ver producto
								</Link>
							) : null}
						</div>
					</div>
				</div>
			</section>

			<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-5 shadow-xl backdrop-blur lg:p-6">
				<div className="flex flex-col gap-2">
					<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
						Tinte asociado
					</p>
					<h3 className="text-2xl font-semibold text-slate-950">
						{product?.name ?? "Sin producto vinculado"}
					</h3>
				</div>

				{product ? (
					<div className="mt-5 grid gap-5 lg:grid-cols-[180px_minmax(0,1fr)]">
						<div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
							<div className="relative aspect-square">
								{product.image_url ? (
									<Image
										src={product.image_url}
										alt={product.name}
										fill
										className="object-contain p-3"
										sizes="180px"
									/>
								) : (
									<div className="grid h-full place-items-center bg-slate-100 px-4 text-center text-sm text-slate-500">
										Sin imagen
									</div>
								)}
							</div>
						</div>

						<div className="space-y-4">
							<div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
								<InfoTile
									label="Referencia"
									value={visibleProductReference || product.reference}
								/>
								<InfoTile
									label="Línea"
									value={product.productLine?.name ?? "Sin línea"}
								/>
								<InfoTile
									label="Formato"
									value={product.format ?? "Sin formato"}
								/>
								<InfoTile label="Packing" value={product.packing} />
							</div>

							<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
								<p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
									Descripción
								</p>
								<p className="mt-2 text-sm leading-7 text-slate-600">
									{product.description ||
										"Producto de coloración asociado a este tono."}
								</p>
							</div>
						</div>
					</div>
				) : (
					<div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-6 text-sm text-slate-500">
						Este tono todavía no tiene un tinte vinculado en el catálogo.
					</div>
				)}
			</section>
		</div>
	);
}
