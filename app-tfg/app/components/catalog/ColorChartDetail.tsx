"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import H1Title from "@/app/components/H1Title";
import { useSessionStorageState } from "@/app/hooks/useSessionStorageState";
import { formatDateTime } from "@/lib/utils/user-utils";
import type { SerializedColorChartDetail } from "./coloration-serializers";

type Props = {
	title: string;
	subtitle: string;
	backHref: string;
	toneDetailBasePath: string;
	colorChart: SerializedColorChartDetail;
};

function normalizeText(value: string | null | undefined) {
	return String(value ?? "")
		.trim()
		.normalize("NFD")
		.replace(/\p{Diacritic}/gu, "")
		.toLowerCase();
}

export default function ColorChartDetail({
	title,
	subtitle,
	toneDetailBasePath,
	colorChart,
}: Props) {
	const [search, setSearch] = useSessionStorageState(
		`color-chart-detail:${colorChart.id}:search`,
		"",
	);

	const filteredReferences = useMemo(() => {
		const searchTerm = normalizeText(search);

		if (!searchTerm) {
			return colorChart.colorReferences ?? [];
		}

		return (colorChart.colorReferences ?? []).filter((reference) =>
			normalizeText(
				[
					reference.code,
					reference.name,
					reference.description,
				].join(" "),
			).includes(searchTerm),
		);
	}, [colorChart.colorReferences, search]);

	return (
		<div className="space-y-6">
			<H1Title title={title} subtitle={subtitle} />

			<div className="flex justify-end">
				<div className="text-sm text-slate-600">
					Actualizado el{" "}
					<span className="font-medium text-slate-900">
						{formatDateTime(colorChart.updated_at)}
					</span>
				</div>
			</div>

			<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
				<div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
					<div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
						<div className="relative aspect-square">
							{colorChart.image_url ? (
								<Image
									src={colorChart.image_url}
									alt={colorChart.name}
									fill
									className="object-contain bg-white"
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
								{colorChart.productLine?.productCategory?.name ?? "Coloración"}
							</p>

							<h2 className="mt-2 text-3xl font-bold text-slate-900">
								{colorChart.name}
							</h2>

							<p className="mt-3 text-sm leading-7 text-slate-600">
								{colorChart.description ||
									"Carta de color disponible para consulta comercial y técnica."}
							</p>
						</div>

						<div className="flex flex-wrap gap-3">
							<div className="rounded-full bg-sky-100 px-4 py-2 text-sm font-medium text-sky-700">
								Línea: {colorChart.productLine?.name ?? "Sin línea"}
							</div>
							<div className="rounded-full bg-fuchsia-100 px-4 py-2 text-sm font-medium text-fuchsia-700">
								{(colorChart.colorReferences ?? []).length} referencias
							</div>
						</div>

						<div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
							<label
								htmlFor="color-chart-reference-search"
								className="mb-2 block text-sm font-semibold text-slate-700"
							>
								Buscar tono o referencia
							</label>
							<input
								id="color-chart-reference-search"
								type="text"
								value={search}
								onChange={(event) => setSearch(event.target.value)}
								placeholder="Ej. 6.34, cobre, beige..."
								className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
							/>
						</div>
					</div>
				</div>
			</section>

			<section className="glass-card rounded-3xl border border-white/30 bg-white/75 p-6 shadow-xl backdrop-blur">
				<div className="flex items-center justify-between gap-3">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
							Referencias
						</p>
						<h3 className="text-2xl font-semibold text-slate-900">
							Tonos disponibles
						</h3>
					</div>

					<div className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
						<span className="font-semibold text-slate-900">
							{filteredReferences.length}
						</span>{" "}
						coincidencias
					</div>
				</div>

				{filteredReferences.length === 0 ? (
					<div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-6 text-sm text-slate-500">
						No hay referencias que coincidan con la búsqueda indicada.
					</div>
				) : (
					<div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{filteredReferences.map((reference) => (
							<Link
								key={reference.id}
								href={`${toneDetailBasePath}/${reference.id}`}
								className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
							>
								<div className="relative aspect-square bg-slate-100">
									{reference.image_url ? (
										<Image
											src={reference.image_url}
											alt={`${reference.code} ${reference.name}`}
											fill
											className="object-contain bg-white"
											sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 320px"
										/>
									) : (
										<div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-500">
											Sin imagen de muestra
										</div>
									)}
								</div>

								<div className="space-y-3 p-5">
									<div className="flex flex-wrap items-center gap-2">
										<span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
											{reference.code}
										</span>
										<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
											Orden {reference.display_order}
										</span>
									</div>

									<div>
										<h4 className="text-lg font-semibold text-slate-900">
											{reference.name}
										</h4>
										<p className="mt-2 text-sm leading-6 text-slate-600">
											{reference.description || "Sin descripción adicional."}
										</p>
									</div>
								</div>
							</Link>
						))}
					</div>
				)}
			</section>
		</div>
	);
}
