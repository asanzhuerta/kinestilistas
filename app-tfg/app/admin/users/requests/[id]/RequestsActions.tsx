"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
	getAdminCommercialLabel,
} from "@/app/admin/users/_shared/admin-commercial-options";
import SafeForm from "@/app/components/forms/SafeForm";
import SubmitButton from "@/app/components/forms/SubmitButton";
import { useAdminCommercialOptions } from "@/app/hooks/api/useAdminCommercialOptions";
import { requestJson } from "@/lib/api/client";

type Props = {
	solicitudId: string;
	requiresCommercialAssignment: boolean;
};

export default function RequestsActions({
	solicitudId,
	requiresCommercialAssignment,
}: Props) {
	const router = useRouter();
	const [rejectionReason, setRejectionReason] = useState("");
	const [approveLoading, setApproveLoading] = useState(false);
	const [rejectLoading, setRejectLoading] = useState(false);
	const [selectedCommercialId, setSelectedCommercialId] = useState("");
	const [error, setError] = useState<string | null>(null);
	const {
		options: commercials,
		loading: loadingCommercials,
		error: commercialsError,
	} = useAdminCommercialOptions(requiresCommercialAssignment);

	async function handleApprove() {
		try {
			setError(null);
			setApproveLoading(true);

			if (requiresCommercialAssignment && !selectedCommercialId.trim()) {
				throw new Error(
					"Debes seleccionar el comercial asignado antes de aprobar la solicitud",
				);
			}

			await requestJson<{ message?: string }>(
				`/api/admin/user-requests/${solicitudId}/approve`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						commercialId: requiresCommercialAssignment
							? selectedCommercialId.trim()
							: null,
					}),
					fallbackMessage: "No se pudo aprobar la solicitud",
				},
			);

			router.push("/admin/users/requests");
			router.refresh();
		} catch (actionError) {
			setError(
				actionError instanceof Error ? actionError.message : "Error inesperado",
			);
		} finally {
			setApproveLoading(false);
		}
	}

	async function handleRejectSubmit(event: React.FormEvent) {
		event.preventDefault();

		try {
			setError(null);
			setRejectLoading(true);

			const trimmedReason = rejectionReason.trim();

			if (!trimmedReason) {
				throw new Error("Debes indicar un motivo de rechazo");
			}

			await requestJson<{ message?: string }>(
				`/api/admin/user-requests/${solicitudId}/reject`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						reason: trimmedReason,
					}),
					fallbackMessage: "No se pudo rechazar la solicitud",
				},
			);

			router.push("/admin/users/requests");
			router.refresh();
		} catch (actionError) {
			setError(
				actionError instanceof Error ? actionError.message : "Error inesperado",
			);
		} finally {
			setRejectLoading(false);
		}
	}

	return (
		<div className="grid gap-6 lg:grid-cols-2">
			<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
				<h2 className="text-lg font-semibold text-emerald-800">
					Aprobar solicitud
				</h2>

				<p className="mt-2 text-sm text-emerald-700">
					Se creará el usuario definitivo en el sistema con los datos de esta
					solicitud.
				</p>

				{requiresCommercialAssignment ? (
					<div className="mt-4 space-y-2">
						<label
							htmlFor="request-commercial-id"
							className="block text-sm font-medium text-emerald-900"
						>
							Comercial asignado
						</label>

						<select
							id="request-commercial-id"
							value={selectedCommercialId}
							onChange={(event) =>
								setSelectedCommercialId(event.target.value)
							}
							disabled={loadingCommercials || approveLoading || rejectLoading}
							className="w-full rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500"
						>
							<option value="">
								{loadingCommercials
									? "Cargando comerciales..."
									: "Selecciona un comercial"}
							</option>

							{commercials.map((commercial) => (
								<option key={commercial.id} value={commercial.id}>
									{getAdminCommercialLabel(commercial)}
								</option>
							))}
						</select>

						<p className="text-xs text-emerald-700">
							Al aprobar una solicitud de cliente, debe quedar asociado a un
							comercial.
						</p>
					</div>
				) : null}

				<div className="mt-4">
					<button
						type="button"
						onClick={() => void handleApprove()}
						disabled={
							approveLoading || rejectLoading || Boolean(commercialsError)
						}
						className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{approveLoading ? "Aprobando..." : "Confirmar aprobación"}
					</button>
				</div>
			</div>

			<SafeForm
				onSubmit={handleRejectSubmit}
				className="rounded-2xl border border-red-200 bg-red-50 p-5"
			>
				<h2 className="text-lg font-semibold text-red-800">
					Rechazar solicitud
				</h2>

				<p className="mt-2 text-sm text-red-700">
					Indique un motivo para dejar constancia del rechazo.
				</p>

				<div className="mt-4">
					<label
						htmlFor="request-rejection-reason"
						className="mb-2 block text-sm font-medium text-red-900"
					>
						Motivo del rechazo
					</label>

					<textarea
						id="request-rejection-reason"
						value={rejectionReason}
						onChange={(event) => setRejectionReason(event.target.value)}
						rows={4}
						placeholder="Explique brevemente el motivo del rechazo..."
						className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-slate-500"
					/>
				</div>

				<div className="mt-4">
					<SubmitButton
						isSubmitting={rejectLoading}
						disabled={approveLoading}
						submittingText="Rechazando..."
						className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700"
					>
						Confirmar rechazo
					</SubmitButton>
				</div>
			</SafeForm>

			{error || commercialsError ? (
				<div className="lg:col-span-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
					{error || commercialsError}
				</div>
			) : null}
		</div>
	);
}
