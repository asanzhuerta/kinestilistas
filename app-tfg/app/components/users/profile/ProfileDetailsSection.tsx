import { formatDate } from "@/lib/utils/user-utils";
import {
	FormDataState,
	CatalogOption,
} from "@/app/components/users/profile/user-profile-card-types";

type Props = {
	formData: FormDataState;
	isEditableMode: boolean;
	isAdminEditMode: boolean;
	roles: CatalogOption[];
	createdAt: string | null;
	lastLoginAt: string | null;
	onChange: (
		field: keyof FormDataState,
	) => (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => void;
	userCompany?: string | null;
	userPhone?: string | null;
};

export default function ProfileDetailsSection({
	formData,
	isEditableMode,
	isAdminEditMode,
	roles,
	createdAt,
	lastLoginAt,
	onChange,
	userCompany,
	userPhone,
}: Props) {
	return (
		<div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
			<div className="rounded-xl bg-slate-50 p-4">
				<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
					Empresa
				</p>

				{isEditableMode ? (
					<input
						type="text"
						value={formData.company}
						onChange={onChange("company")}
						className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
					/>
				) : (
					<p className="mt-1 text-sm text-slate-800">{userCompany || "-"}</p>
				)}
			</div>

			<div className="rounded-xl bg-slate-50 p-4">
				<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
					Teléfono
				</p>

				{isEditableMode ? (
					<input
						type="text"
						value={formData.phone}
						onChange={onChange("phone")}
						className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
					/>
				) : (
					<p className="mt-1 text-sm text-slate-800">{userPhone || "-"}</p>
				)}
			</div>

			{isAdminEditMode ? (
				<>
					<div className="rounded-xl bg-slate-50 p-4">
						<label
							htmlFor="profile-role"
							className="text-xs font-semibold uppercase tracking-wide text-slate-500"
						>
							Rol
						</label>
						<select
							id="profile-role"
							value={String(formData.roleId)}
							onChange={onChange("roleId")}
							className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
						>
							{roles
								.filter((role) => role.name !== "Administrador")
								.map((role) => (
									<option key={role.id} value={role.id}>
										{role.name}
									</option>
								))}
						</select>
					</div>

				</>
			) : null}

			<div className="rounded-xl bg-slate-50 p-4">
				<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
					Fecha de alta
				</p>
				<p className="mt-1 text-sm text-slate-800">
					{createdAt ? formatDate(createdAt) : "-"}
				</p>
			</div>

			<div className="rounded-xl bg-slate-50 p-4">
				<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
					Último login
				</p>
				<p className="mt-1 text-sm text-slate-800">
					{lastLoginAt ? formatDate(lastLoginAt) : "-"}
				</p>
			</div>
		</div>
	);
}
