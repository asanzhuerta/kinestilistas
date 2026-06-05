type Props = {
	displayedProfileImage?: string | null;
	isUploadingImage: boolean;
	profileImageStatusText: string | null;
	fileInputRef: React.RefObject<HTMLInputElement | null>;
	onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	onOpenFilePicker: () => void;
	compact?: boolean;
};

export default function ProfileImageUploadField({
	displayedProfileImage,
	isUploadingImage,
	profileImageStatusText,
	fileInputRef,
	onFileChange,
	onOpenFilePicker,
	compact = false,
}: Props) {
	return (
		<div>
			<label
				htmlFor="profile-image-upload"
				className="text-xs font-semibold uppercase tracking-wide text-slate-500"
			>
				Foto de perfil
			</label>

			<div className={compact ? "mt-2 flex flex-col gap-2" : "mt-2 flex flex-col gap-3"}>
				<input
					id="profile-image-upload"
					ref={fileInputRef}
					type="file"
					accept="image/*"
					onChange={onFileChange}
					className="hidden"
					disabled={isUploadingImage}
				/>

				<div className="flex flex-wrap items-center gap-3">
					<button
						type="button"
						onClick={onOpenFilePicker}
						disabled={isUploadingImage}
						className={`rounded-xl bg-slate-900 font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 ${
							compact ? "px-3 py-2 text-xs" : "px-4 py-2 text-sm"
						}`}
					>
						{displayedProfileImage ? "Cambiar foto" : "Seleccionar archivo"}
					</button>

					{profileImageStatusText ? (
						<p className={compact ? "text-xs text-slate-500" : "text-sm text-slate-500"}>
							{profileImageStatusText}
						</p>
					) : null}
				</div>
			</div>
		</div>
	);
}
