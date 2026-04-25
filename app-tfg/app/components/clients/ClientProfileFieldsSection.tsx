"use client";

import dynamic from "next/dynamic";
import { ClientFormDataState } from "./client-profile-types";

const ClientLocationPickerMap = dynamic(
	() => import("@/app/components/maps/ClientLocationPickerMap"),
	{
		ssr: false,
		loading: () => (
			<div className="h-[420px] rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
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

	return (
		<div className="mt-6">
			<div className="mb-3">
				<h3 className="text-lg font-semibold text-slate-800">
					Datos del cliente profesional
				</h3>
				<p className="mt-1 text-sm text-slate-600">
					Información comercial, de localización y de disponibilidad para visitas.
				</p>
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				<div className="rounded-xl bg-slate-50 p-4">
					<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
						Nombre del establecimiento
					</label>

					{isEditable ? (
						<input
							type="text"
							value={formData.client_name}
							onChange={onChange("client_name")}
							className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
						/>
					) : (
						<p className="mt-1 text-sm text-slate-800">
							{formData.client_name || "-"}
						</p>
					)}
				</div>

				<div className="rounded-xl bg-slate-50 p-4">
					<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
						Persona de contacto
					</label>

					{isEditable ? (
						<input
							type="text"
							value={formData.contact_name}
							onChange={onChange("contact_name")}
							className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
						/>
					) : (
						<p className="mt-1 text-sm text-slate-800">
							{formData.contact_name || "-"}
						</p>
					)}
				</div>

				<div className="rounded-xl bg-slate-50 p-4">
					<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
						Identificador fiscal
					</label>

					{isEditable ? (
						<input
							type="text"
							value={formData.tax_id}
							onChange={onChange("tax_id")}
							className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
						/>
					) : (
						<p className="mt-1 text-sm text-slate-800">{formData.tax_id || "-"}</p>
					)}
				</div>

				<div className="rounded-xl bg-slate-50 p-4">
					<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
						Dirección
					</label>

					{isEditable ? (
						<input
							type="text"
							value={formData.address}
							onChange={onChange("address")}
							className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
						/>
					) : (
						<p className="mt-1 text-sm text-slate-800">{formData.address || "-"}</p>
					)}
				</div>

				<div className="rounded-xl bg-slate-50 p-4">
					<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
						Ciudad
					</label>

					{isEditable ? (
						<input
							type="text"
							value={formData.city}
							onChange={onChange("city")}
							className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
						/>
					) : (
						<p className="mt-1 text-sm text-slate-800">{formData.city || "-"}</p>
					)}
				</div>

				<div className="rounded-xl bg-slate-50 p-4">
					<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
						Código postal
					</label>

					{isEditable ? (
						<input
							type="text"
							value={formData.postal_code}
							onChange={onChange("postal_code")}
							className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
						/>
					) : (
						<p className="mt-1 text-sm text-slate-800">
							{formData.postal_code || "-"}
						</p>
					)}
				</div>

				<div className="rounded-xl bg-slate-50 p-4">
					<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
						Provincia / zona
					</label>

					{isEditable ? (
						<input
							type="text"
							value={formData.province}
							onChange={onChange("province")}
							className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
						/>
					) : (
						<p className="mt-1 text-sm text-slate-800">
							{formData.province || "-"}
						</p>
					)}
				</div>

				<div className="rounded-xl bg-slate-50 p-4">
					<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
						Inicio de visitas
					</label>

					{isEditable ? (
						<input
							type="time"
							value={formData.visit_window_start_time}
							onChange={onChange("visit_window_start_time")}
							className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
						/>
					) : (
						<p className="mt-1 text-sm text-slate-800">
							{formData.visit_window_start_time || "-"}
						</p>
					)}
				</div>

				<div className="rounded-xl bg-slate-50 p-4">
					<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
						Fin de visitas
					</label>

					{isEditable ? (
						<input
							type="time"
							value={formData.visit_window_end_time}
							onChange={onChange("visit_window_end_time")}
							className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
						/>
					) : (
						<p className="mt-1 text-sm text-slate-800">
							{formData.visit_window_end_time || "-"}
						</p>
					)}
				</div>

				<div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
					<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
						Estado de geolocalización
					</label>

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

				{clientId ? (
					<div className="rounded-3xl border border-slate-200 bg-white p-4 md:col-span-2">
						<div className="mb-4">
							<h4 className="text-base font-semibold text-slate-900">
								Confirmación en mapa
							</h4>
							<p className="mt-1 text-sm text-slate-600">
								Busca la dirección y ajusta el marcador si hace falta para
								confirmar la ubicación exacta del establecimiento.
							</p>
						</div>

						{allowLocationEdit ? (
							<ClientLocationPickerMap
								clientId={clientId}
								confirmedLat={formData.lat ? Number(formData.lat) : null}
								confirmedLng={formData.lng ? Number(formData.lng) : null}
								initialSearchQuery={initialSearchQuery}
								onConfirmLocation={onConfirmLocation}
							/>
						) : (
							<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
								La ubicación solo puede confirmarse desde edición propia del
								cliente o edición administrativa.
							</div>
						)}
					</div>
				) : null}

				{isAdminEditMode ? (
					<div className="rounded-xl bg-slate-50 p-4 md:col-span-2">
						<label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
							Notas
						</label>

						{isEditable ? (
							<textarea
								value={formData.notes}
								onChange={onChange("notes")}
								rows={4}
								className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
							/>
						) : (
							<p className="mt-1 text-sm text-slate-800">{formData.notes || "-"}</p>
						)}
					</div>
				) : null}
			</div>
		</div>
	);
}
