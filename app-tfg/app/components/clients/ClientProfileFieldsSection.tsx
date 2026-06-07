"use client";

import dynamic from "next/dynamic";
import type { ClientFormDataState } from "@/lib/contracts/client-profile";

const ClientLocationPickerMap = dynamic(
	() => import("@/app/components/maps/ClientLocationPickerMap"),
	{
		ssr: false,
		loading: () => (
			<div className="h-[260px] rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
				Cargando mapa...
			</div>
		),
	},
);

type Props = {
	formData: ClientFormDataState;
	onChange: (
		field: keyof ClientFormDataState,
	) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
	onConfirmLocation: (lat: number, lng: number) => void;
	isEditable: boolean;
	isAdminEditMode?: boolean;
	clientId?: string;
	allowLocationEdit?: boolean;
	compact?: boolean;
};

type TextFieldConfig = {
	field: keyof ClientFormDataState;
	id: string;
	label: string;
	type?: string;
	spanClass?: string;
};

function formatCoordinate(value: string) {
	return value || "-";
}

export default function ClientProfileFieldsSection({
	formData,
	onChange,
	onConfirmLocation,
	isEditable,
	isAdminEditMode = false,
	clientId,
	allowLocationEdit = false,
	compact = false,
}: Props) {
	const hasConfirmedLocation = Boolean(formData.lat && formData.lng);
	const initialSearchQuery = [
		formData.address,
		formData.city,
		formData.postal_code,
		formData.province,
	]
		.filter(Boolean)
		.join(", ");
	const mapResetKey = clientId ? `${clientId}:${formData.lat}:${formData.lng}` : "";
	const cardClass = compact
		? "rounded-2xl bg-slate-50/85 p-3"
		: "rounded-xl bg-slate-50 p-4";
	const inputClass =
		"mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400";
	const labelClass =
		"text-xs font-semibold uppercase tracking-wide text-slate-500";
	const fields: TextFieldConfig[] = [
		{
			field: "client_name",
			id: "client-name",
			label: "Nombre del establecimiento",
		},
		{
			field: "contact_name",
			id: "client-contact-name",
			label: "Persona de contacto",
		},
		{ field: "tax_id", id: "client-tax-id", label: "Identificador fiscal" },
		{ field: "address", id: "client-address", label: "Dirección" },
		{ field: "city", id: "client-city", label: "Ciudad" },
		{ field: "postal_code", id: "client-postal-code", label: "Código postal" },
		{ field: "province", id: "client-province", label: "Provincia / zona" },
		{
			field: "visit_window_start_time",
			id: "client-visit-window-start",
			label: "Inicio visitas",
			type: "time",
		},
		{
			field: "visit_window_end_time",
			id: "client-visit-window-end",
			label: "Fin visitas",
			type: "time",
		},
	];

	function renderField(config: TextFieldConfig) {
		const value = String(formData[config.field] ?? "");

		return (
			<div key={config.id} className={`${cardClass} ${config.spanClass ?? ""}`}>
				<label htmlFor={config.id} className={labelClass}>
					{config.label}
				</label>

				{isEditable ? (
					<input
						id={config.id}
						type={config.type ?? "text"}
						value={value}
						onChange={onChange(config.field)}
						className={inputClass}
					/>
				) : (
					<p className="mt-1 text-sm text-slate-800">{value || "-"}</p>
				)}
			</div>
		);
	}

	return (
		<div className={compact ? "space-y-3" : "mt-6"}>
			<div className={compact ? "mb-1" : "mb-3"}>
				<h3
					className={
						compact
							? "text-base font-semibold text-slate-800"
							: "text-lg font-semibold text-slate-800"
					}
				>
					Datos del cliente profesional
				</h3>
				<p className="mt-1 text-sm text-slate-600">
					Información comercial, localización y disponibilidad para visitas.
				</p>
			</div>

			<div
				className={
					compact
						? "grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4"
						: "grid grid-cols-1 gap-4 md:grid-cols-2"
				}
			>
				{fields.map(renderField)}

				<div
					className={`${cardClass} ${
						compact ? "2xl:col-span-4" : "md:col-span-2"
					}`}
				>
					<div
						className={
							compact
								? "grid gap-3 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
								: "space-y-4"
						}
					>
						<div className="min-w-0">
							<p className={labelClass}>Localización del salón</p>

							<div
								className={`mt-2 rounded-2xl px-4 py-3 text-sm ${
									hasConfirmedLocation
										? "border border-emerald-200 bg-emerald-50 text-emerald-800"
										: "border border-amber-200 bg-amber-50 text-amber-800"
								}`}
							>
								{hasConfirmedLocation
									? "Ubicación confirmada. Si cambias la dirección, vuelve a validarla en el mapa."
									: "Dirección pendiente de confirmar en mapa. Puedes guardar sin hacerlo y el sistema intentará geocodificarla automáticamente."}
							</div>

							<div className="mt-3 grid gap-3 md:grid-cols-2">
								<div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
									<span className="font-medium">Latitud:</span>{" "}
									{formatCoordinate(formData.lat)}
								</div>
								<div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
									<span className="font-medium">Longitud:</span>{" "}
									{formatCoordinate(formData.lng)}
								</div>
							</div>
						</div>

						<div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-3">
							<div className={compact ? "mb-2" : "mb-3"}>
								<h4 className="text-base font-semibold text-slate-900">
									Confirmación en mapa
								</h4>
								<p className="mt-1 text-sm text-slate-600">
									Busca la dirección y ajusta el marcador si hace falta.
								</p>
							</div>

							{clientId && allowLocationEdit ? (
								<ClientLocationPickerMap
									key={mapResetKey}
									clientId={clientId}
									confirmedLat={formData.lat ? Number(formData.lat) : null}
									confirmedLng={formData.lng ? Number(formData.lng) : null}
									initialSearchQuery={initialSearchQuery}
									onConfirmLocation={onConfirmLocation}
									compact={compact}
								/>
							) : (
								<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
									La ubicación solo puede confirmarse desde edición propia del
									cliente o edición administrativa.
								</div>
							)}
						</div>
					</div>
				</div>

				{isAdminEditMode ? (
					<div
						className={`${cardClass} ${
							compact ? "2xl:col-span-4" : "md:col-span-2"
						}`}
					>
						<label htmlFor="client-notes" className={labelClass}>
							Notas
						</label>

						{isEditable ? (
							<textarea
								id="client-notes"
								value={formData.notes}
								onChange={onChange("notes")}
								rows={compact ? 3 : 4}
								className={inputClass}
							/>
						) : (
							<p className="mt-1 text-sm text-slate-800">
								{formData.notes || "-"}
							</p>
						)}
					</div>
				) : null}
			</div>
		</div>
	);
}
