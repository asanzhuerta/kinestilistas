import UserAvatar from "@/app/components/users/UserAvatar";
import ProfileImageUploadField from "@/app/components/users/profile/ProfileImageUploadField";
import {
	getRoleClassesLight,
	getRoleLabel,
	getStatusClassesLight,
	getStatusLabel,
} from "@/lib/utils/user-utils";
import {
	FormDataState,
	UserProfileCardUser,
} from "@/app/components/users/profile/user-profile-card-types";

type Props = {
	user: UserProfileCardUser;
	formData: FormDataState;
	isViewMode: boolean;
	isSelfEditMode: boolean;
	isAdminEditMode: boolean;
	displayedProfileImage?: string | null;
	profileImageStatusText: string | null;
	isUploadingImage: boolean;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onChange: (
		field: keyof FormDataState,
	) => (
		e: React.ChangeEvent<
			HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
		>,
	) => void;
	onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onOpenFilePicker: () => void;
	compact?: boolean;
};

export default function ProfileIdentitySection({
	user,
	formData,
	isViewMode,
	isSelfEditMode,
	isAdminEditMode,
	displayedProfileImage,
	profileImageStatusText,
	isUploadingImage,
	fileInputRef,
	onChange,
	onFileChange,
	onOpenFilePicker,
	compact = false,
}: Props) {
	const statusBadges = (
		<div
			className={
				compact
					? "mt-3 flex flex-wrap justify-center gap-2"
					: "mt-3 flex flex-wrap gap-2"
			}
		>
			<span
				className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getRoleClassesLight(
					user.role.code,
				)}`}
			>
				{getRoleLabel(user.role.code)}
			</span>

			<span
				className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassesLight(
					user.status.code,
				)}`}
			>
				{getStatusLabel(user.status.code)}
			</span>
		</div>
	);

	return (
		<div
			className={
				compact
					? "rounded-3xl border border-slate-200/70 bg-slate-50/80 p-4"
					: "flex flex-col gap-6 md:flex-row md:items-start"
			}
		>
			<UserAvatar
				name={user.name}
				imageUrl={displayedProfileImage}
				size={compact ? "lg" : "xl"}
				className={compact ? "mx-auto shadow-md shadow-slate-950/10" : ""}
			/>

			{compact ? statusBadges : null}

			<div className={compact ? "mt-3 min-w-0" : "min-w-0 flex-1"}>
				{/* ---------------------------------------------------------------- */}
				{/* MODO 1: VIEW                                                     */}
				{/* ---------------------------------------------------------------- */}
				{isViewMode ? (
					<>
						<h2 className="text-xl font-semibold text-slate-800">
							{user.name}
						</h2>
						<p className="mt-1 text-sm text-slate-600">{user.email}</p>
					</>
				) : null}

				{/* ---------------------------------------------------------------- */}
				{/* MODO 2: EDIT (perfil propio)                                      */}
				{/* ---------------------------------------------------------------- */}
				{isSelfEditMode ? (
					<div className={compact ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 gap-4"}>
						<div>
							<label
								htmlFor="profile-name"
								className="text-xs font-semibold uppercase tracking-wide text-slate-500"
							>
								Nombre
							</label>
							<input
								id="profile-name"
								type="text"
								value={formData.name}
								onChange={onChange("name")}
								className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
								required
							/>
						</div>

						<div>
							<label
								htmlFor="profile-email"
								className="text-xs font-semibold uppercase tracking-wide text-slate-500"
							>
								Correo electrónico
							</label>
							<input
								id="profile-email"
								type="email"
								value={formData.email}
								onChange={onChange("email")}
								className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
								required
							/>
						</div>

						<ProfileImageUploadField
							displayedProfileImage={displayedProfileImage}
							isUploadingImage={isUploadingImage}
							profileImageStatusText={profileImageStatusText}
							fileInputRef={fileInputRef}
							onFileChange={onFileChange}
							onOpenFilePicker={onOpenFilePicker}
							compact={compact}
						/>
					</div>
				) : null}

				{/* ---------------------------------------------------------------- */}
				{/* MODO 3: ADMIN-EDIT                                                */}
				{/* ---------------------------------------------------------------- */}
				{isAdminEditMode ? (
					<div className={compact ? "grid grid-cols-1 gap-3" : "grid grid-cols-1 gap-4"}>
						<div>
							<label
								htmlFor="profile-name"
								className="text-xs font-semibold uppercase tracking-wide text-slate-500"
							>
								Nombre
							</label>
							<input
								id="profile-name"
								type="text"
								value={formData.name}
								onChange={onChange("name")}
								className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
								required
							/>
						</div>

						<div>
							<label
								htmlFor="profile-email"
								className="text-xs font-semibold uppercase tracking-wide text-slate-500"
							>
								Correo electrónico
							</label>
							<input
								id="profile-email"
								type="email"
								value={formData.email}
								onChange={onChange("email")}
								className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
								required
							/>
						</div>

						<ProfileImageUploadField
							displayedProfileImage={displayedProfileImage}
							isUploadingImage={isUploadingImage}
							profileImageStatusText={profileImageStatusText}
							fileInputRef={fileInputRef}
							onFileChange={onFileChange}
							onOpenFilePicker={onOpenFilePicker}
							compact={compact}
						/>
					</div>
				) : null}

				{compact ? null : statusBadges}
			</div>
		</div>
	);
}
