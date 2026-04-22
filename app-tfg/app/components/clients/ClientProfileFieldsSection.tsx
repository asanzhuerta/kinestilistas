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

// ----------------------------------------------------------------------------
// PROPS
// ----------------------------------------------------------------------------
// Este componente solo pinta los campos del bloque de cliente profesional.
// No sabe nada de fetch, endpoints ni lógica de guardado.
// Recibe el estado y el manejador de cambios desde el componente padre.
type Props = {
	formData: ClientFormDataState;
	onChange: (
		field: keyof ClientFormDataState,
	) => (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => void;
	isEditable: boolean;
	isAdminEditMode?: boolean;
	clientId?: string;
	geolocationStatus?: string | null;
	geolocationVerifiedAt?: string | null;
	initialLat?: string | null;
	initialLng?: string | null;
	allowLocationEdit?: boolean;
};
export default function ClientProfileFieldsSection({
	formData,
	onChange,
	isEditable,
	isAdminEditMode = false,
	clientId,
	geolocationStatus = null,
	geolocationVerifiedAt = null,
	initialLat = null,
	initialLng = null,
	allowLocationEdit = false,
}: Props) {
	return (
		<div className="mt-6">
			{/* ==================================================================== */}
			{/* CABECERA DEL BLOQUE DE CLIENTE                                       */}
			{/* ==================================================================== */}
			<div className="mb-3">
				<h3 className="text-lg font-semibold text-slate-800">
					Datos del cliente profesional
				</h3>
				<p className="mt-1 text-sm text-slate-600">
					Información comercial y de localización asociada al perfil cliente.
				</p>
			</div>

			{/* ==================================================================== */}
			{/* CAMPOS DEL PERFIL CLIENTE                                            */}
			{/* ==================================================================== */}
			<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
				{/* Nombre del establecimiento */}
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

				{/* Persona de contacto */}
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

				{/* Identificador fiscal */}
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
						<p className="mt-1 text-sm text-slate-800">
							{formData.tax_id || "-"}
						</p>
					)}
				</div>

				{/* Dirección */}
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
						<p className="mt-1 text-sm text-slate-800">
							{formData.address || "-"}
						</p>
					)}
				</div>

				{/* Ciudad */}
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
						<p className="mt-1 text-sm text-slate-800">
							{formData.city || "-"}
						</p>
					)}
				</div>

				{/* Código postal */}
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

				{/* Provincia / zona */}
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

				{/* Mapa de localización */}
				<div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
					<p className="text-sm font-medium text-slate-700">
						Estado de ubicación
					</p>

					{geolocationStatus === "verified" ? (
						<div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
							Ubicación verificada
							{geolocationVerifiedAt ? (
								<span className="block text-xs text-emerald-700 mt-1">
									Confirmada:{" "}
									{new Date(geolocationVerifiedAt).toLocaleString("es-ES")}
								</span>
							) : null}
						</div>
					) : (
						<div className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
							Dirección guardada, pero ubicación pendiente de confirmar en el
							mapa.
						</div>
					)}
				</div>
				{clientId ? (
					<div className="mt-6 rounded-3xl border border-slate-200 bg-white p-4">
						<div className="mb-4">
							<h4 className="text-base font-semibold text-slate-900">
								Ubicación en mapa
							</h4>
							<p className="mt-1 text-sm text-slate-600">
								Busca la dirección y ajusta el marcador si hace falta.
							</p>
						</div>

						{allowLocationEdit ? (
							<ClientLocationPickerMap
								clientId={clientId}
								initialLat={initialLat ? Number(initialLat) : null}
								initialLng={initialLng ? Number(initialLng) : null}
								initialSearchQuery={[
									formData.address,
									formData.city,
									formData.postal_code,
									formData.province,
								]
									.filter(Boolean)
									.join(", ")}
							/>
						) : (
							<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
								La ubicación solo puede confirmarse desde edición propia del
								cliente o edición administrativa.
							</div>
						)}
					</div>
				) : null}
				{/* Notas: solo visibles en edición administrativa */}
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
