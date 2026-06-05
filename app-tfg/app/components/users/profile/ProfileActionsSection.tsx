import Link from "next/link";
import SubmitButton from "@/app/components/forms/SubmitButton";

type Props = {
	isViewMode: boolean;
	isSelfEditMode: boolean;
	isAdminEditMode: boolean;
	isSaving: boolean;
	submitLabel?: string;
	backHref?: string;
	onReset: () => void;
	compact?: boolean;
};

export default function ProfileActionsSection({
	isViewMode,
	isSelfEditMode,
	isAdminEditMode,
	isSaving,
	submitLabel,
	backHref,
	onReset,
	compact = false,
}: Props) {
	if (isViewMode) {
		return null;
	}

	return (
		<div className={compact ? "flex flex-wrap gap-2" : "mt-6 flex flex-wrap gap-3"}>
			<SubmitButton
				isSubmitting={isSaving}
				submittingText="Guardando..."
				className={`rounded-xl bg-slate-900 text-sm font-medium text-white hover:bg-slate-800 ${
					compact ? "px-3 py-2" : "px-4 py-2"
				}`}
			>
				{submitLabel ?? "Guardar cambios"}
			</SubmitButton>

			{isSelfEditMode ? (
				<button
					type="button"
					onClick={onReset}
					className={`rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50 ${
						compact ? "px-3 py-2" : "px-4 py-2"
					}`}
				>
					Restablecer
				</button>
			) : null}

			{isAdminEditMode && backHref ? (
				<Link
					href={backHref}
					className={`rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700 transition hover:bg-slate-50 ${
						compact ? "px-3 py-2" : "px-4 py-2"
					}`}
				>
					Cancelar
				</Link>
			) : null}
		</div>
	);
}
