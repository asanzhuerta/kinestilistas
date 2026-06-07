"use client";

import Image from "next/image";
import Link from "next/link";
import {
	AnimatePresence,
	LazyMotion,
	domAnimation,
	m,
	useReducedMotion,
} from "framer-motion";
import UserAvatar from "@/app/components/users/UserAvatar";
import type {
	EntityTableCardVariant,
	EntityTableConfig,
	EntityTableItem,
} from "./entity-table-types";

type Props = {
	items: EntityTableItem[];
	emptyMessage?: string;
	config?: EntityTableConfig;
};

// Devuelve las clases visuales del boton según el tipo de accion.
function getActionClasses(variant?: "primary" | "secondary" | "warning") {
	if (variant === "warning") {
		return "bg-amber-100 text-amber-700 hover:bg-amber-200";
	}

	if (variant === "secondary") {
		return "bg-slate-100 text-slate-700 hover:bg-slate-200";
	}

	return "bg-slate-950 text-white shadow-lg shadow-slate-950/15 hover:bg-slate-800";
}

// Tarjeta reutilizable que representa un único elemento del listado.
function EntityCard({
	item,
	shouldReduceMotion,
	cardVariant = "default",
}: {
	item: EntityTableItem;
	shouldReduceMotion: boolean;
	cardVariant?: EntityTableCardVariant;
}) {
	const isHeadlineVariant = cardVariant === "headline";
	const isMediaVariant = cardVariant === "media";
	const isCatalogProductVariant = cardVariant === "catalog-product";
	const isColorReferenceVariant = cardVariant === "color-reference";
	const hasSubtitle = item.subtitle.trim().length > 0;
	const hasSecondaryImage = Boolean(
		item.secondaryImageUrl || item.secondaryImageLabel,
	);
	const motionProps = shouldReduceMotion
		? {
				initial: false,
				animate: { opacity: 1, y: 0, scale: 1 },
				exit: { opacity: 1, y: 0, scale: 1 },
				transition: { duration: 0 },
			}
		: {
				initial: { opacity: 0, y: 12, scale: 0.98 },
				animate: { opacity: 1, y: 0, scale: 0.98 },
				exit: { opacity: 0, y: -12, scale: 0.98 },
				transition: { duration: 0.28, ease: "easeInOut" as const },
			};

	if (isColorReferenceVariant) {
		const colorReferenceCard = (
			<m.div
				layout
				{...motionProps}
				className="group relative min-h-[18rem] overflow-hidden rounded-2xl border border-slate-200 bg-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
			>
				{item.imageUrl ? (
					<div className="absolute inset-0">
						<Image
							src={item.imageUrl}
							alt={item.title}
							fill
							className="object-cover transition duration-300 group-hover:scale-[1.02]"
							sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
						/>
					</div>
				) : null}

				<div className="relative flex min-h-[18rem] flex-col justify-between p-4 sm:p-5">
					<div className="flex justify-end">
						{item.badges?.length ? (
							<div className="flex max-w-full flex-wrap justify-end gap-2">
								{item.badges.map((badge) => (
									<span
										key={`${item.id}-${badge.label}`}
										className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold shadow-sm backdrop-blur-sm sm:text-xs ${badge.className ?? "bg-slate-100 text-slate-700"}`}
									>
										{badge.label}
									</span>
								))}
							</div>
						) : null}
					</div>

					<div className="max-w-[16ch]">
						<p
							className="text-2xl font-semibold leading-[1.05] text-white sm:text-[2rem]"
							style={{ textShadow: "0 3px 16px rgba(0, 0, 0, 0.72)" }}
						>
							{item.title}
						</p>
					</div>
				</div>
			</m.div>
		);

		if (item.href) {
			return (
				<Link
					href={item.href}
					aria-label={`Editar ${item.title}`}
					className="block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2"
				>
					{colorReferenceCard}
				</Link>
			);
		}

		return colorReferenceCard;
	}

	if (isCatalogProductVariant) {
		return (
			<m.div
				layout
				{...motionProps}
				className="group flex h-full flex-col rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-950/10"
			>
				<div className="relative overflow-hidden rounded-[1.45rem] border border-slate-100 bg-white shadow-inner shadow-slate-950/5">
					<div
						className={`grid h-[15rem] min-h-0 gap-2 overflow-hidden p-3 ${
							hasSecondaryImage
								? "grid-cols-[minmax(0,1fr)_4.75rem]"
								: "grid-cols-1"
						}`}
					>
						<div className="h-full min-h-0 overflow-hidden">
							<UserAvatar
								name={item.title}
								imageUrl={item.imageUrl}
								size="xl"
								shape="soft-square"
								imageFit="contain"
								imagePositionClass="object-center"
								imagePaddingClass="p-0"
								imageBackgroundClass="bg-white"
								imageIntrinsicPixels={640}
								imageSizes="(max-width: 640px) 70vw, (max-width: 1280px) 28vw, 260px"
								className="h-full max-h-full w-full rounded-[1.2rem] text-5xl"
							/>
						</div>

						{hasSecondaryImage ? (
							<div className="flex h-full min-h-0 items-end justify-end overflow-hidden pt-11">
								<div className="w-full rounded-2xl border border-slate-100 bg-white p-1.5 shadow-sm shadow-slate-950/5">
									<UserAvatar
										name={item.secondaryImageLabel ?? item.title}
										imageUrl={item.secondaryImageUrl}
										size="xl"
										shape="soft-square"
										imageFit="contain"
										imagePaddingClass="p-0"
										imageBackgroundClass="bg-white"
										imageIntrinsicPixels={192}
										imageSizes="96px"
										className="h-16 w-full rounded-xl text-sm"
									/>
								</div>
							</div>
						) : null}
					</div>

					{item.badges?.length ? (
						<div className="absolute right-3 top-3 flex max-w-[75%] flex-wrap justify-end gap-2">
							{item.badges.map((badge) => (
								<span
									key={`${item.id}-${badge.label}`}
									className={`inline-flex rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.08em] shadow-sm backdrop-blur-md ${badge.className ?? "border border-slate-200 bg-white/90 text-slate-700"}`}
								>
									{badge.label}
								</span>
							))}
						</div>
					) : null}

				</div>

				<div className="flex flex-1 flex-col px-1 pt-4">
					<p className="text-xl font-black leading-[1.05] tracking-[-0.03em] text-slate-950 sm:text-2xl">
						{item.title}
					</p>
					{hasSubtitle ? (
						<p className="mt-2 text-sm leading-relaxed text-slate-600">
							{item.subtitle}
						</p>
					) : null}

					{item.fields.length ? (
						<div className="mt-4 grid grid-cols-2 gap-2 text-sm">
							{item.fields.map((field) => (
								<div
									key={`${item.id}-${field.label}`}
									className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
								>
									<p className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
										{field.label}
									</p>
									<p className="mt-1 font-semibold text-slate-900">
										{field.value || "-"}
									</p>
								</div>
							))}
						</div>
					) : null}

					{item.actions?.length ? (
						<div className="mt-auto flex flex-wrap gap-2 pt-5">
							{item.actions.map((action) => (
								<Link
									key={`${item.id}-${action.label}`}
									href={action.href}
									className={`inline-flex min-h-11 flex-1 items-center justify-center rounded-full px-4 py-2.5 text-sm font-black uppercase tracking-[0.08em] transition ${getActionClasses(
										action.variant,
									)}`}
								>
									{action.label}
								</Link>
							))}
						</div>
					) : null}
				</div>
			</m.div>
		);
	}

	return (
		<m.div
			layout
			{...motionProps}
			className={`rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md ${
				isHeadlineVariant
					? "flex min-h-[136px] flex-col justify-between p-5"
					: isCatalogProductVariant
						? "p-5"
					: isMediaVariant
						? "flex min-h-[168px] flex-col justify-between p-4"
						: "p-3.5"
			}`}
		>
			{isCatalogProductVariant ? (
				<>
					<div className="lg:hidden">
						<div className="grid grid-cols-2 gap-4">
							<div className="aspect-[4/5] w-full">
								<UserAvatar
									name={item.title}
									imageUrl={item.imageUrl}
									size="xl"
									shape="soft-square"
									imageFit="contain"
									imagePositionClass="object-center"
									imagePaddingClass="p-0"
									imageBackgroundClass="bg-white"
									imageIntrinsicPixels={384}
									imageSizes="50vw"
									className="h-full w-full rounded-2xl text-4xl"
								/>
							</div>

							<div className="flex min-w-0 flex-col gap-3">
								{item.badges?.length ? (
									<div className="flex flex-wrap justify-end gap-2">
										{item.badges.map((badge) => (
											<span
												key={`${item.id}-${badge.label}`}
												className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold ${badge.className ?? "bg-slate-100 text-slate-700"}`}
											>
												{badge.label}
											</span>
										))}
									</div>
								) : null}

								{item.secondaryImageUrl || item.secondaryImageLabel ? (
									<div className="aspect-square w-full">
										<UserAvatar
											name={item.secondaryImageLabel ?? item.title}
											imageUrl={item.secondaryImageUrl}
											size="xl"
											shape="soft-square"
											imageFit="contain"
											imagePaddingClass="p-0"
											imageBackgroundClass="bg-white"
											imageIntrinsicPixels={192}
											imageSizes="50vw"
											className="h-full w-full rounded-2xl text-2xl"
										/>
									</div>
								) : null}

								{item.secondaryBadge ? (
									<span
										className={`inline-flex max-w-full justify-center rounded-full px-3 py-1 text-center text-[11px] font-semibold leading-tight ${item.secondaryBadge.className ?? "bg-slate-100 text-slate-700"}`}
									>
										{item.secondaryBadge.label}
									</span>
								) : null}
							</div>
						</div>

						<div className="mt-4">
							<p className="text-2xl font-semibold leading-tight text-slate-900">
								{item.title}
							</p>
							{hasSubtitle ? (
								<p className="mt-2 text-sm leading-relaxed text-slate-600">
									{item.subtitle}
								</p>
							) : null}

							{item.fields.length ? (
								<div className="mt-4 grid grid-cols-1 gap-y-2 text-sm text-slate-600">
									{item.fields.map((field) => (
										<div key={`${item.id}-${field.label}`}>
											<span className="font-medium text-slate-700">
												{field.label}:
											</span>{" "}
											{field.value || "-"}
										</div>
									))}
								</div>
							) : null}

							{item.actions?.length ? (
								<div className="mt-4 flex flex-wrap gap-2">
									{item.actions.map((action) => (
										<Link
											key={`${item.id}-${action.label}`}
											href={action.href}
											className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition ${getActionClasses(
												action.variant,
											)}`}
										>
											{action.label}
										</Link>
									))}
								</div>
							) : null}
						</div>
					</div>

					<div className="hidden items-stretch gap-4 lg:grid lg:grid-cols-[7.25rem_minmax(0,1fr)_6.5rem] xl:grid-cols-[9rem_minmax(0,1fr)_7.5rem]">
						<div className="h-full w-full self-stretch">
							<UserAvatar
								name={item.title}
								imageUrl={item.imageUrl}
								size="xl"
								shape="soft-square"
								imageFit="contain"
								imagePositionClass="object-center"
								imagePaddingClass="p-0"
								imageBackgroundClass="bg-white"
								imageIntrinsicPixels={384}
								imageSizes="144px"
								className="h-full min-h-[14rem] w-full rounded-2xl text-4xl xl:min-h-[16rem]"
							/>
						</div>

						<div className="min-w-0">
							<p className="text-xl font-semibold leading-tight text-slate-900 xl:text-[1.7rem]">
								{item.title}
							</p>
							{hasSubtitle ? (
								<p className="mt-2 text-sm leading-relaxed text-slate-600">
									{item.subtitle}
								</p>
							) : null}

							{item.fields.length ? (
								<div className="mt-4 grid grid-cols-1 gap-y-2 text-sm text-slate-600 xl:gap-x-5">
									{item.fields.map((field) => (
										<div key={`${item.id}-${field.label}`}>
											<span className="font-medium text-slate-700">
												{field.label}:
											</span>{" "}
											{field.value || "-"}
										</div>
									))}
								</div>
							) : null}

							{item.actions?.length ? (
								<div className="mt-4 flex flex-wrap gap-2">
									{item.actions.map((action) => (
										<Link
											key={`${item.id}-${action.label}`}
											href={action.href}
											className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition ${getActionClasses(
												action.variant,
											)}`}
										>
											{action.label}
										</Link>
									))}
								</div>
							) : null}
						</div>

						<div className="flex flex-col items-end gap-3 self-start">
							{item.badges?.length ? (
								<div className="flex flex-wrap justify-end gap-2">
									{item.badges.map((badge) => (
										<span
											key={`${item.id}-${badge.label}`}
											className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold sm:text-xs ${badge.className ?? "bg-slate-100 text-slate-700"}`}
										>
											{badge.label}
										</span>
									))}
								</div>
							) : null}

							{item.secondaryImageUrl || item.secondaryImageLabel ? (
								<div className="aspect-square w-full max-w-[5rem] xl:max-w-[6rem]">
									<UserAvatar
										name={item.secondaryImageLabel ?? item.title}
										imageUrl={item.secondaryImageUrl}
										size="xl"
										shape="soft-square"
										imageFit="contain"
										imagePaddingClass="p-0"
										imageBackgroundClass="bg-white"
										imageIntrinsicPixels={192}
										imageSizes="96px"
										className="h-full w-full rounded-xl text-2xl sm:rounded-2xl"
									/>
								</div>
							) : null}

							{item.secondaryBadge ? (
								<span
									className={`inline-flex max-w-full justify-center rounded-full px-3 py-1 text-center text-[11px] font-semibold leading-tight sm:text-xs ${item.secondaryBadge.className ?? "bg-slate-100 text-slate-700"}`}
								>
									{item.secondaryBadge.label}
								</span>
							) : null}
						</div>
					</div>
				</>
			) : (
				<>
					<div
						className={`flex items-start gap-3 ${
							isHeadlineVariant
								? "min-h-0"
								: isMediaVariant
									? "gap-4"
									: ""
						}`}
					>
						{!isHeadlineVariant ? (
							<UserAvatar
								name={item.title}
								imageUrl={item.imageUrl}
								size={isMediaVariant ? "xl" : "md"}
								shape={isMediaVariant ? "soft-square" : "circle"}
								imageFit={isMediaVariant ? "contain" : "cover"}
								imageBackgroundClass="bg-white"
								className="flex-shrink-0"
							/>
						) : null}

						<div className="min-w-0 flex-1">
							{isMediaVariant && item.badges?.length ? (
								<div className="mb-2 flex flex-wrap gap-2">
									{item.badges.map((badge) => (
										<span
											key={`${item.id}-${badge.label}`}
											className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className ?? "bg-slate-100 text-slate-700"}`}
										>
											{badge.label}
										</span>
									))}
								</div>
							) : null}

							<p
								className={
									isHeadlineVariant
										? "text-lg font-semibold leading-tight text-slate-800"
										: isMediaVariant
											? "text-lg font-semibold leading-tight text-slate-800"
											: "truncate text-sm font-semibold text-slate-800"
								}
							>
								{item.title}
							</p>
							<p
								className={
									isHeadlineVariant
										? "mt-1 text-sm leading-snug text-slate-600"
										: isMediaVariant
											? "mt-1 text-sm leading-snug text-slate-600"
											: "truncate text-xs text-slate-600"
								}
							>
								{item.subtitle}
							</p>
						</div>

						{!isMediaVariant && item.badges?.length ? (
							<div className="ml-auto flex flex-col items-end gap-2">
								{item.badges.map((badge) => (
									<span
										key={`${item.id}-${badge.label}`}
										className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.className ?? "bg-slate-100 text-slate-700"}`}
									>
										{badge.label}
									</span>
								))}
							</div>
						) : null}
					</div>

					{!isHeadlineVariant && !isMediaVariant ? (
						<div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-600">
							{item.fields.map((field) => (
								<div key={`${item.id}-${field.label}`}>
									<span className="font-medium text-slate-700">
										{field.label}:
									</span>{" "}
									{field.value || "-"}
								</div>
							))}
						</div>
					) : null}

					{item.actions?.length ? (
						<div
							className={
								isHeadlineVariant || isMediaVariant
									? "mt-5 flex flex-wrap gap-2"
									: "mt-3 flex flex-wrap gap-2"
							}
						>
							{item.actions.map((action) => (
								<Link
									key={`${item.id}-${action.label}`}
									href={action.href}
									className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium transition ${getActionClasses(
										action.variant,
									)}`}
								>
									{action.label}
								</Link>
							))}
						</div>
					) : null}
				</>
			)}
		</m.div>
	);
}

// Vista principal del listado reutilizable.
// Muestra una rejilla de tarjetas o un mensaje vacio si no hay resultados.
export default function EntityTableView({
	items,
	emptyMessage = "No hay elementos que coincidan con los filtros.",
	config,
}: Props) {
	const shouldReduceMotion = useReducedMotion() ?? false;

	return (
		<div className="rounded-2xl border border-gray-200 bg-white shadow-md">
			{items.length === 0 ? (
				<div className="px-4 py-10 text-center text-slate-500">
					{emptyMessage}
				</div>
			) : (
				<LazyMotion features={domAnimation}>
					<m.div
						layout
						className={
							config?.gridClassName ??
							"grid grid-cols-1 gap-3 p-3 sm:grid-cols-2 xl:grid-cols-3"
						}
					>
						<AnimatePresence initial={false} mode="popLayout">
							{items.map((item) => (
								<EntityCard
									key={item.id}
									item={item}
									shouldReduceMotion={shouldReduceMotion}
									cardVariant={config?.cardVariant}
								/>
							))}
						</AnimatePresence>
					</m.div>
				</LazyMotion>
			)}
		</div>
	);
}
