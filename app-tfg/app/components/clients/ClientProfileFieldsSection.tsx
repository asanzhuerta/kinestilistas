"use client";

import { ClientFormDataState } from "./client-profile-types";

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
	) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
	isEditable: boolean;
	isAdminEditMode?: boolean;
};

export default function ClientProfileFieldsSection({
	formData,
	onChange,
	isEditable,
	isAdminEditMode = false,
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
					Información comercial, de localización y de disponibilidad para visitas.
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
