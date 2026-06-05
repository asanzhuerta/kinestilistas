"use client";

import Image from "next/image";
import { useRef } from "react";

type Props = {
	fieldName: string;
	label: string;
	imageUrl: string | null;
	isUploading: boolean;
	statusText: string | null;
	helpText?: string;
	onFileSelected: (file: File) => void;
	onClear?: () => void;
};

export default function CatalogImageUploadField({
	fieldName,
	label,
	imageUrl,
	isUploading,
	statusText,
	helpText,
	onFileSelected,
	onClear,
}: Props) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
		const file = event.target.files?.[0];

		if (file) {
			onFileSelected(file);
		}

		event.target.value = "";
	}

	return (
		<div>
			<label
				htmlFor={`${fieldName}-upload`}
				className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
			>
				{label}
			</label>

			<input
				id={`${fieldName}-upload`}
				ref={fileInputRef}
				type="file"
				aria-label={label}
				accept="image/*"
				onChange={handleFileChange}
				className="hidden"
				disabled={isUploading}
			/>

			<div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
				<div className="flex flex-col gap-4 lg:flex-row lg:items-start">
					<div className="flex min-h-40 w-full items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white lg:max-w-48">
						{imageUrl ? (
							<Image
								src={imageUrl}
								alt={label}
								width={192}
								height={192}
								className="h-40 w-full object-cover"
							/>
						) : (
							<p className="px-4 text-center text-sm text-slate-500">
								No hay imagen cargada todavia.
							</p>
						)}
					</div>

					<div className="flex-1 space-y-3">
						<div className="flex flex-wrap gap-3">
							<button
								type="button"
								onClick={() => fileInputRef.current?.click()}
								disabled={isUploading}
								className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
							>
								{isUploading
									? "Subiendo..."
									: imageUrl
										? "Cambiar imagen"
										: "Subir imagen"}
							</button>

							{imageUrl && onClear ? (
								<button
									type="button"
									onClick={onClear}
									disabled={isUploading}
									className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
								>
									Quitar imagen
								</button>
							) : null}
						</div>

						{statusText ? (
							<p className="text-sm text-slate-600">{statusText}</p>
						) : (
							<p className="text-sm text-slate-500">
								La imagen se almacenara en Cloudinary para usarla en la app.
							</p>
						)}

						{helpText ? (
							<p className="text-xs text-slate-500">{helpText}</p>
						) : null}
					</div>
				</div>
			</div>
		</div>
	);
}
