"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ApiClientError, requestJson } from "@/lib/api/client";
import type {
	ClientOptionView,
	ClientSegmentAssignmentView,
	ProductLineOptionView,
	ProductOptionView,
	PromotionView,
	SegmentView,
	TrainingEventView,
} from "./communication-view-types";

type AdminTab = "promotions" | "trainings" | "segments" | "assignments";

type Props = {
	segments: SegmentView[];
	assignments: ClientSegmentAssignmentView[];
	clients: ClientOptionView[];
	products: ProductOptionView[];
	productLines: ProductLineOptionView[];
	promotions: PromotionView[];
	trainings: TrainingEventView[];
};

const tabs: Array<{ key: AdminTab; label: string }> = [
	{ key: "promotions", label: "Promociones" },
	{ key: "trainings", label: "Formaciones" },
	{ key: "segments", label: "Segmentos" },
	{ key: "assignments", label: "Asignaciones" },
];

const emptyPromotionForm = {
	title: "",
	description: "",
	promotionType: "descuento",
	benefit: "",
	startDate: "",
	endDate: "",
	status: "draft",
	productId: "",
	productLineId: "",
	clientId: "",
	customerSegmentId: "",
};

const emptyTrainingForm = {
	title: "",
	description: "",
	startsAt: "",
	location: "",
	modality: "in_person",
	content: "",
	status: "draft",
	capacity: "",
};

const emptySegmentForm = {
	code: "",
	name: "",
	description: "",
	criteria: "",
};

const emptyAssignmentForm = {
	clientId: "",
	segmentId: "",
	notes: "",
};

function getErrorMessage(error: unknown, fallback: string) {
	return error instanceof ApiClientError ? error.message : fallback;
}

const dateFormatter = new Intl.DateTimeFormat("es-ES", {
	day: "2-digit",
	month: "short",
	year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
	day: "2-digit",
	month: "short",
	year: "numeric",
	hour: "2-digit",
	minute: "2-digit",
});

function formatDate(value: string) {
	const parsed = new Date(`${value}T00:00:00`);

	if (Number.isNaN(parsed.getTime())) {
		return value;
	}

	return dateFormatter.format(parsed);
}

function formatDateTime(value: string) {
	const parsed = new Date(value);

	if (Number.isNaN(parsed.getTime())) {
		return value;
	}

	return dateTimeFormatter.format(parsed);
}

function toDateTimeLocal(value: string) {
	const parsed = new Date(value);

	if (Number.isNaN(parsed.getTime())) {
		return value.slice(0, 16);
	}

	const localTime = new Date(
		parsed.getTime() - parsed.getTimezoneOffset() * 60_000,
	);

	return localTime.toISOString().slice(0, 16);
}

function StatusBadge({ status }: { status: string }) {
	return (
		<span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
			{status}
		</span>
	);
}

export default function AdminCommunicationsWorkspace({
	segments: initialSegments,
	assignments: initialAssignments,
	clients,
	products,
	productLines,
	promotions: initialPromotions,
	trainings: initialTrainings,
}: Props) {
	const router = useRouter();
	const [activeTab, setActiveTab] = useState<AdminTab>("promotions");
	const [segments, setSegments] = useState(initialSegments);
	const [assignments, setAssignments] = useState(initialAssignments);
	const [promotions, setPromotions] = useState(initialPromotions);
	const [trainings, setTrainings] = useState(initialTrainings);
	const [promotionForm, setPromotionForm] = useState(emptyPromotionForm);
	const [trainingForm, setTrainingForm] = useState(emptyTrainingForm);
	const [segmentForm, setSegmentForm] = useState(emptySegmentForm);
	const [assignmentForm, setAssignmentForm] = useState(emptyAssignmentForm);
	const [editingPromotionId, setEditingPromotionId] = useState<string | null>(
		null,
	);
	const [editingTrainingId, setEditingTrainingId] = useState<string | null>(
		null,
	);
	const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");
	const [pendingAction, setPendingAction] = useState<string | null>(null);
	const [confirmDeleteAction, setConfirmDeleteAction] = useState<string | null>(
		null,
	);

	useEffect(() => {
		setSegments(initialSegments);
		setAssignments(initialAssignments);
		setPromotions(initialPromotions);
		setTrainings(initialTrainings);
	}, [initialSegments, initialAssignments, initialPromotions, initialTrainings]);

	function clearFeedback() {
		setMessage("");
		setError("");
	}

	function confirmDelete(actionKey: string, messageText: string) {
		clearFeedback();

		if (confirmDeleteAction !== actionKey) {
			setConfirmDeleteAction(actionKey);
			setMessage(messageText);
			return false;
		}

		setConfirmDeleteAction(null);
		return true;
	}

	function refreshAfter(messageText: string) {
		setMessage(messageText);
		router.refresh();
	}

	function resetPromotionForm() {
		setPromotionForm(emptyPromotionForm);
		setEditingPromotionId(null);
	}

	function resetTrainingForm() {
		setTrainingForm(emptyTrainingForm);
		setEditingTrainingId(null);
	}

	function resetSegmentForm() {
		setSegmentForm(emptySegmentForm);
		setEditingSegmentId(null);
	}

	function buildPromotionPayload() {
		return {
			...promotionForm,
			productId: promotionForm.productId || null,
			productLineId: promotionForm.productLineId || null,
			clientId: promotionForm.clientId || null,
			customerSegmentId: promotionForm.customerSegmentId || null,
		};
	}

	function buildTrainingPayload() {
		return {
			...trainingForm,
			capacity: trainingForm.capacity || null,
		};
	}

	function startEditingPromotion(promotion: PromotionView) {
		clearFeedback();
		setActiveTab("promotions");
		setEditingPromotionId(promotion.id);
		setPromotionForm({
			title: promotion.title,
			description: promotion.description,
			promotionType: promotion.promotionType,
			benefit: promotion.benefit,
			startDate: promotion.startDate,
			endDate: promotion.endDate,
			status: promotion.status,
			productId: promotion.productId ?? "",
			productLineId: promotion.productLineId ?? "",
			clientId: promotion.clientId ?? "",
			customerSegmentId: promotion.customerSegmentId ?? "",
		});
	}

	function startEditingTraining(training: TrainingEventView) {
		clearFeedback();
		setActiveTab("trainings");
		setEditingTrainingId(training.id);
		setTrainingForm({
			title: training.title,
			description: training.description,
			startsAt: toDateTimeLocal(training.startsAt),
			location: training.location ?? "",
			modality: training.modality,
			content: training.content ?? "",
			status: training.status,
			capacity: training.capacity ? String(training.capacity) : "",
		});
	}

	function startEditingSegment(segment: SegmentView) {
		clearFeedback();
		setActiveTab("segments");
		setEditingSegmentId(segment.id);
		setSegmentForm({
			code: segment.code,
			name: segment.name,
			description: segment.description ?? "",
			criteria: segment.criteria ?? "",
		});
	}

	async function handleSubmitPromotion(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		clearFeedback();

		const isEditing = Boolean(editingPromotionId);
		const actionKey = isEditing
			? `promotion-save-${editingPromotionId}`
			: "create-promotion";
		setPendingAction(actionKey);

		try {
			await requestJson(
				isEditing
					? `/api/admin/communications/promotions/${editingPromotionId}`
					: "/api/admin/communications/promotions",
				{
					method: isEditing ? "PATCH" : "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(buildPromotionPayload()),
					fallbackMessage: isEditing
						? "No se pudo actualizar la promocion"
						: "No se pudo crear la promocion",
				},
			);
			resetPromotionForm();
			refreshAfter(
				isEditing
					? "Promocion actualizada correctamente"
					: "Promocion creada correctamente",
			);
		} catch (error) {
			setError(
				getErrorMessage(
					error,
					isEditing
						? "No se pudo actualizar la promocion"
						: "No se pudo crear la promocion",
				),
			);
		} finally {
			setPendingAction(null);
		}
	}

	async function patchPromotionStatus(id: string, status: string) {
		clearFeedback();
		setPendingAction(`promotion-${id}`);

		try {
			await requestJson(`/api/admin/communications/promotions/${id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ status }),
				fallbackMessage: "No se pudo actualizar la promocion",
			});
			refreshAfter("Promocion actualizada");
		} catch (error) {
			setError(getErrorMessage(error, "No se pudo actualizar la promocion"));
		} finally {
			setPendingAction(null);
		}
	}

	async function deletePromotion(id: string) {
		if (
			!confirmDelete(
				`promotion-delete-${id}`,
				"Pulsa de nuevo en eliminar para confirmar la promocion.",
			)
		) {
			return;
		}

		setPendingAction(`promotion-delete-${id}`);

		try {
			await requestJson(`/api/admin/communications/promotions/${id}`, {
				method: "DELETE",
				fallbackMessage: "No se pudo eliminar la promocion",
			});
			if (editingPromotionId === id) {
				resetPromotionForm();
			}
			refreshAfter("Promocion eliminada");
		} catch (error) {
			setError(getErrorMessage(error, "No se pudo eliminar la promocion"));
		} finally {
			setPendingAction(null);
		}
	}

	async function handleSubmitTraining(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		clearFeedback();

		const isEditing = Boolean(editingTrainingId);
		const actionKey = isEditing
			? `training-save-${editingTrainingId}`
			: "create-training";
		setPendingAction(actionKey);

		try {
			await requestJson(
				isEditing
					? `/api/admin/communications/trainings/${editingTrainingId}`
					: "/api/admin/communications/trainings",
				{
					method: isEditing ? "PATCH" : "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(buildTrainingPayload()),
					fallbackMessage: isEditing
						? "No se pudo actualizar la formacion"
						: "No se pudo crear la formacion",
				},
			);
			resetTrainingForm();
			refreshAfter(
				isEditing
					? "Formacion actualizada correctamente"
					: "Formacion creada correctamente",
			);
		} catch (error) {
			setError(
				getErrorMessage(
					error,
					isEditing
						? "No se pudo actualizar la formacion"
						: "No se pudo crear la formacion",
				),
			);
		} finally {
			setPendingAction(null);
		}
	}

	async function patchTrainingStatus(id: string, status: string) {
		clearFeedback();
		setPendingAction(`training-${id}`);

		try {
			await requestJson(`/api/admin/communications/trainings/${id}`, {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ status }),
				fallbackMessage: "No se pudo actualizar la formacion",
			});
			refreshAfter("Formacion actualizada");
		} catch (error) {
			setError(getErrorMessage(error, "No se pudo actualizar la formacion"));
		} finally {
			setPendingAction(null);
		}
	}

	async function deleteTraining(id: string) {
		if (
			!confirmDelete(
				`training-delete-${id}`,
				"Pulsa de nuevo en eliminar para confirmar la formacion.",
			)
		) {
			return;
		}

		setPendingAction(`training-delete-${id}`);

		try {
			await requestJson(`/api/admin/communications/trainings/${id}`, {
				method: "DELETE",
				fallbackMessage: "No se pudo eliminar la formacion",
			});
			if (editingTrainingId === id) {
				resetTrainingForm();
			}
			refreshAfter("Formacion eliminada");
		} catch (error) {
			setError(getErrorMessage(error, "No se pudo eliminar la formacion"));
		} finally {
			setPendingAction(null);
		}
	}

	async function handleSubmitSegment(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		clearFeedback();

		const isEditing = Boolean(editingSegmentId);
		const actionKey = isEditing
			? `segment-save-${editingSegmentId}`
			: "create-segment";
		setPendingAction(actionKey);

		try {
			await requestJson(
				isEditing
					? `/api/admin/communications/segments/${editingSegmentId}`
					: "/api/admin/communications/segments",
				{
					method: isEditing ? "PATCH" : "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(segmentForm),
					fallbackMessage: isEditing
						? "No se pudo actualizar el segmento"
						: "No se pudo crear el segmento",
				},
			);
			resetSegmentForm();
			refreshAfter(
				isEditing
					? "Segmento actualizado correctamente"
					: "Segmento creado correctamente",
			);
		} catch (error) {
			setError(
				getErrorMessage(
					error,
					isEditing
						? "No se pudo actualizar el segmento"
						: "No se pudo crear el segmento",
				),
			);
		} finally {
			setPendingAction(null);
		}
	}

	async function deleteSegment(id: string) {
		if (
			!confirmDelete(
				`segment-${id}`,
				"Pulsa de nuevo en eliminar para confirmar el segmento.",
			)
		) {
			return;
		}

		setPendingAction(`segment-${id}`);

		try {
			await requestJson(`/api/admin/communications/segments/${id}`, {
				method: "DELETE",
				fallbackMessage: "No se pudo eliminar el segmento",
			});
			if (editingSegmentId === id) {
				resetSegmentForm();
			}
			refreshAfter("Segmento eliminado");
		} catch (error) {
			setError(getErrorMessage(error, "No se pudo eliminar el segmento"));
		} finally {
			setPendingAction(null);
		}
	}

	async function handleCreateAssignment(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		clearFeedback();
		setPendingAction("create-assignment");

		try {
			await requestJson("/api/admin/communications/client-segments", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(assignmentForm),
				fallbackMessage: "No se pudo asignar el segmento",
			});
			setAssignmentForm(emptyAssignmentForm);
			refreshAfter("Cliente asignado al segmento");
		} catch (error) {
			setError(getErrorMessage(error, "No se pudo asignar el segmento"));
		} finally {
			setPendingAction(null);
		}
	}

	async function deleteAssignment(id: string) {
		if (
			!confirmDelete(
				`assignment-${id}`,
				"Pulsa de nuevo en quitar para confirmar la asignacion.",
			)
		) {
			return;
		}

		setPendingAction(`assignment-${id}`);

		try {
			await requestJson(`/api/admin/communications/client-segments/${id}`, {
				method: "DELETE",
				fallbackMessage: "No se pudo quitar la asignacion",
			});
			refreshAfter("Asignacion eliminada");
		} catch (error) {
			setError(getErrorMessage(error, "No se pudo quitar la asignacion"));
		} finally {
			setPendingAction(null);
		}
	}

	const promotionSubmitPending =
		pendingAction === "create-promotion" ||
		pendingAction === `promotion-save-${editingPromotionId}`;
	const trainingSubmitPending =
		pendingAction === "create-training" ||
		pendingAction === `training-save-${editingTrainingId}`;
	const segmentSubmitPending =
		pendingAction === "create-segment" ||
		pendingAction === `segment-save-${editingSegmentId}`;

	return (
		<div className="space-y-6">
			<section className="grid gap-3 md:grid-cols-4">
				<div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
					<p className="text-2xl font-semibold text-slate-900">
						{promotions.length}
					</p>
					<p className="text-xs uppercase tracking-[0.2em] text-slate-500">
						promociones
					</p>
				</div>
				<div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
					<p className="text-2xl font-semibold text-slate-900">
						{trainings.length}
					</p>
					<p className="text-xs uppercase tracking-[0.2em] text-slate-500">
						formaciones
					</p>
				</div>
				<div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
					<p className="text-2xl font-semibold text-slate-900">
						{segments.length}
					</p>
					<p className="text-xs uppercase tracking-[0.2em] text-slate-500">
						segmentos
					</p>
				</div>
				<div className="rounded-2xl border border-slate-200 bg-white/80 p-4">
					<p className="text-2xl font-semibold text-slate-900">
						{assignments.length}
					</p>
					<p className="text-xs uppercase tracking-[0.2em] text-slate-500">
						asignaciones
					</p>
				</div>
			</section>

			<div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white/75 p-2">
				{tabs.map((tab) => (
					<button
						key={tab.key}
						type="button"
						onClick={() => setActiveTab(tab.key)}
						className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
							activeTab === tab.key
								? "bg-slate-900 text-white"
								: "text-slate-600 hover:bg-slate-100"
						}`}
					>
						{tab.label}
					</button>
				))}
			</div>

			{message ? (
				<div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
					{message}
				</div>
			) : null}

			{error ? (
				<div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					{error}
				</div>
			) : null}

			{activeTab === "promotions" ? (
				<section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
					<form
						onSubmit={handleSubmitPromotion}
						className="space-y-4 rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm"
					>
						<div>
							<h2 className="text-lg font-semibold text-slate-900">
								{editingPromotionId ? "Editar promocion" : "Nueva promocion"}
							</h2>
							<p className="text-sm text-slate-500">
								Define campanas globales, por segmento o por cliente.
							</p>
						</div>

						<input
							aria-label="Titulo de la promocion"
							required
							placeholder="Titulo"
							value={promotionForm.title}
							onChange={(event) =>
								setPromotionForm((current) => ({
									...current,
									title: event.target.value,
								}))
							}
							className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						/>
						<textarea
							aria-label="Descripcion de la promocion"
							required
							placeholder="Descripcion"
							value={promotionForm.description}
							onChange={(event) =>
								setPromotionForm((current) => ({
									...current,
									description: event.target.value,
								}))
							}
							className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						/>
						<div className="grid gap-3 md:grid-cols-2">
							<input
								aria-label="Tipo de promocion"
								required
								placeholder="Tipo"
								value={promotionForm.promotionType}
								onChange={(event) =>
									setPromotionForm((current) => ({
										...current,
										promotionType: event.target.value,
									}))
								}
								className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							/>
							<input
								aria-label="Beneficio de la promocion"
								required
								placeholder="Beneficio"
								value={promotionForm.benefit}
								onChange={(event) =>
									setPromotionForm((current) => ({
										...current,
										benefit: event.target.value,
									}))
								}
								className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							/>
							<input
								aria-label="Fecha de inicio de la promocion"
								required
								type="date"
								value={promotionForm.startDate}
								onChange={(event) =>
									setPromotionForm((current) => ({
										...current,
										startDate: event.target.value,
									}))
								}
								className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							/>
							<input
								aria-label="Fecha de fin de la promocion"
								required
								type="date"
								value={promotionForm.endDate}
								onChange={(event) =>
									setPromotionForm((current) => ({
										...current,
										endDate: event.target.value,
									}))
								}
								className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							/>
							<select
								aria-label="Estado de la promocion"
								value={promotionForm.status}
								onChange={(event) =>
									setPromotionForm((current) => ({
										...current,
										status: event.target.value,
									}))
								}
								className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							>
								<option value="draft">Borrador</option>
								<option value="active">Activa</option>
								<option value="archived">Archivada</option>
							</select>
							<select
								aria-label="Linea opcional de la promocion"
								value={promotionForm.productLineId}
								onChange={(event) =>
									setPromotionForm((current) => ({
										...current,
										productLineId: event.target.value,
									}))
								}
								className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							>
								<option value="">Linea opcional</option>
								{productLines.map((productLine) => (
									<option key={productLine.id} value={productLine.id}>
										{productLine.name}
									</option>
								))}
							</select>
							<select
								aria-label="Producto opcional de la promocion"
								value={promotionForm.productId}
								onChange={(event) =>
									setPromotionForm((current) => ({
										...current,
										productId: event.target.value,
									}))
								}
								className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							>
								<option value="">Producto opcional</option>
								{products.map((product) => (
									<option key={product.id} value={product.id}>
										{product.reference ? `${product.reference} - ` : ""}
										{product.name}
									</option>
								))}
							</select>
							<select
								aria-label="Cliente opcional de la promocion"
								value={promotionForm.clientId}
								onChange={(event) =>
									setPromotionForm((current) => ({
										...current,
										clientId: event.target.value,
										customerSegmentId: "",
									}))
								}
								className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							>
								<option value="">Cliente opcional</option>
								{clients.map((client) => (
									<option key={client.id} value={client.id}>
										{client.name}
									</option>
								))}
							</select>
							<select
								aria-label="Segmento opcional de la promocion"
								value={promotionForm.customerSegmentId}
								onChange={(event) =>
									setPromotionForm((current) => ({
										...current,
										customerSegmentId: event.target.value,
										clientId: "",
									}))
								}
								className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							>
								<option value="">Segmento opcional</option>
								{segments.map((segment) => (
									<option key={segment.id} value={segment.id}>
										{segment.name}
									</option>
								))}
							</select>
						</div>
						<div className="flex flex-wrap gap-2">
							<button
								type="submit"
								disabled={promotionSubmitPending}
								className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
							>
								{editingPromotionId ? "Guardar cambios" : "Crear promocion"}
							</button>
							{editingPromotionId ? (
								<button
									type="button"
									onClick={resetPromotionForm}
									className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
								>
									Cancelar edicion
								</button>
							) : null}
						</div>
					</form>

					<div className="space-y-3">
						{promotions.length ? (
							promotions.map((promotion) => (
								<article
									key={promotion.id}
									className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm"
								>
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<h3 className="font-semibold text-slate-900">
												{promotion.title}
											</h3>
											<p className="mt-1 text-sm text-slate-600">
												{promotion.description}
											</p>
										</div>
										<StatusBadge status={promotion.status} />
									</div>
									<p className="mt-3 text-sm font-medium text-slate-800">
										{promotion.benefit}
									</p>
									<p className="mt-2 text-xs text-slate-500">
										{formatDate(promotion.startDate)} -{" "}
										{formatDate(promotion.endDate)}
									</p>
									<p className="mt-2 text-xs text-slate-500">
										Ambito:{" "}
										{promotion.clientName ??
											promotion.customerSegmentName ??
											"Global"}
										{promotion.productName
											? ` - Producto: ${promotion.productName}`
											: ""}
										{promotion.productLineName
											? ` - Linea: ${promotion.productLineName}`
											: ""}
									</p>
									<div className="mt-3 flex flex-wrap gap-2">
										<button
											type="button"
											onClick={() =>
												patchPromotionStatus(promotion.id, "active")
											}
											disabled={pendingAction === `promotion-${promotion.id}`}
											className="rounded-lg border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700"
										>
											Activar
										</button>
										<button
											type="button"
											onClick={() =>
												patchPromotionStatus(promotion.id, "archived")
											}
											disabled={pendingAction === `promotion-${promotion.id}`}
											className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600"
										>
											Archivar
										</button>
										<button
											type="button"
											onClick={() => startEditingPromotion(promotion)}
											className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600"
										>
											Editar
										</button>
										<button
											type="button"
											onClick={() => deletePromotion(promotion.id)}
											disabled={
												pendingAction === `promotion-delete-${promotion.id}`
											}
											className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700"
										>
											{confirmDeleteAction ===
											`promotion-delete-${promotion.id}`
												? "Confirmar eliminar"
												: "Eliminar"}
										</button>
									</div>
								</article>
							))
						) : (
							<p className="rounded-2xl border border-dashed border-slate-200 bg-white/75 p-4 text-sm text-slate-500">
								Sin promociones registradas.
							</p>
						)}
					</div>
				</section>
			) : null}

			{activeTab === "trainings" ? (
				<section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
					<form
						onSubmit={handleSubmitTraining}
						className="space-y-4 rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm"
					>
						<div>
							<h2 className="text-lg font-semibold text-slate-900">
								{editingTrainingId ? "Editar formacion" : "Nueva formacion"}
							</h2>
							<p className="text-sm text-slate-500">
								Publica sesiones presenciales, online o mixtas.
							</p>
						</div>
						<input
							aria-label="Titulo de la formacion"
							required
							placeholder="Titulo"
							value={trainingForm.title}
							onChange={(event) =>
								setTrainingForm((current) => ({
									...current,
									title: event.target.value,
								}))
							}
							className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						/>
						<textarea
							aria-label="Descripcion de la formacion"
							required
							placeholder="Descripcion"
							value={trainingForm.description}
							onChange={(event) =>
								setTrainingForm((current) => ({
									...current,
									description: event.target.value,
								}))
							}
							className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						/>
						<div className="grid gap-3 md:grid-cols-2">
							<input
								aria-label="Fecha y hora de inicio de la formacion"
								required
								type="datetime-local"
								value={trainingForm.startsAt}
								onChange={(event) =>
									setTrainingForm((current) => ({
										...current,
										startsAt: event.target.value,
									}))
								}
								className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							/>
							<input
								aria-label="Ubicacion o enlace de la formacion"
								placeholder="Ubicacion o enlace"
								value={trainingForm.location}
								onChange={(event) =>
									setTrainingForm((current) => ({
										...current,
										location: event.target.value,
									}))
								}
								className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							/>
							<select
								aria-label="Modalidad de la formacion"
								value={trainingForm.modality}
								onChange={(event) =>
									setTrainingForm((current) => ({
										...current,
										modality: event.target.value,
									}))
								}
								className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							>
								<option value="in_person">Presencial</option>
								<option value="online">Online</option>
								<option value="hybrid">Mixta</option>
							</select>
							<select
								aria-label="Estado de la formacion"
								value={trainingForm.status}
								onChange={(event) =>
									setTrainingForm((current) => ({
										...current,
										status: event.target.value,
									}))
								}
								className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							>
								<option value="draft">Borrador</option>
								<option value="published">Publicada</option>
								<option value="cancelled">Cancelada</option>
								<option value="completed">Completada</option>
							</select>
							<input
								aria-label="Capacidad de la formacion"
								type="number"
								min="1"
								placeholder="Capacidad opcional"
								value={trainingForm.capacity}
								onChange={(event) =>
									setTrainingForm((current) => ({
										...current,
										capacity: event.target.value,
									}))
								}
								className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
							/>
						</div>
						<textarea
							aria-label="Contenido o temario de la formacion"
							placeholder="Contenido / temario"
							value={trainingForm.content}
							onChange={(event) =>
								setTrainingForm((current) => ({
									...current,
									content: event.target.value,
								}))
							}
							className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						/>
						<div className="flex flex-wrap gap-2">
							<button
								type="submit"
								disabled={trainingSubmitPending}
								className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
							>
								{editingTrainingId ? "Guardar cambios" : "Crear formacion"}
							</button>
							{editingTrainingId ? (
								<button
									type="button"
									onClick={resetTrainingForm}
									className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
								>
									Cancelar edicion
								</button>
							) : null}
						</div>
					</form>

					<div className="space-y-3">
						{trainings.length ? (
							trainings.map((training) => (
								<article
									key={training.id}
									className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm"
								>
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<h3 className="font-semibold text-slate-900">
												{training.title}
											</h3>
											<p className="mt-1 text-sm text-slate-600">
												{training.description}
											</p>
										</div>
										<StatusBadge status={training.status} />
									</div>
									<p className="mt-3 text-xs text-slate-500">
										{formatDateTime(training.startsAt)} - {training.modality}
										{training.location ? ` - ${training.location}` : ""}
									</p>
									<p className="mt-2 text-xs text-slate-500">
										Inscripciones activas: {training.activeEnrollmentsCount}
										{training.capacity ? ` / ${training.capacity}` : ""}
									</p>
									<div className="mt-3 flex flex-wrap gap-2">
										<button
											type="button"
											onClick={() =>
												patchTrainingStatus(training.id, "published")
											}
											disabled={pendingAction === `training-${training.id}`}
											className="rounded-lg border border-emerald-200 px-3 py-1 text-xs font-medium text-emerald-700"
										>
											Publicar
										</button>
										<button
											type="button"
											onClick={() =>
												patchTrainingStatus(training.id, "completed")
											}
											disabled={pendingAction === `training-${training.id}`}
											className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600"
										>
											Completar
										</button>
										<button
											type="button"
											onClick={() =>
												patchTrainingStatus(training.id, "cancelled")
											}
											disabled={pendingAction === `training-${training.id}`}
											className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700"
										>
											Cancelar
										</button>
										<button
											type="button"
											onClick={() => startEditingTraining(training)}
											className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600"
										>
											Editar
										</button>
										<button
											type="button"
											onClick={() => deleteTraining(training.id)}
											disabled={pendingAction === `training-delete-${training.id}`}
											className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700"
										>
											{confirmDeleteAction === `training-delete-${training.id}`
												? "Confirmar eliminar"
												: "Eliminar"}
										</button>
									</div>
								</article>
							))
						) : (
							<p className="rounded-2xl border border-dashed border-slate-200 bg-white/75 p-4 text-sm text-slate-500">
								Sin formaciones registradas.
							</p>
						)}
					</div>
				</section>
			) : null}

			{activeTab === "segments" ? (
				<section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
					<form
						onSubmit={handleSubmitSegment}
						className="space-y-4 rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm"
					>
						<div>
							<h2 className="text-lg font-semibold text-slate-900">
								{editingSegmentId ? "Editar segmento" : "Nuevo segmento"}
							</h2>
							<p className="text-sm text-slate-500">
								Crea grupos comerciales para dirigir promociones.
							</p>
						</div>
						<input
							aria-label="Codigo interno del segmento"
							required
							placeholder="Codigo interno"
							value={segmentForm.code}
							onChange={(event) =>
								setSegmentForm((current) => ({
									...current,
									code: event.target.value,
								}))
							}
							className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						/>
						<input
							aria-label="Nombre del segmento"
							required
							placeholder="Nombre"
							value={segmentForm.name}
							onChange={(event) =>
								setSegmentForm((current) => ({
									...current,
									name: event.target.value,
								}))
							}
							className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						/>
						<textarea
							aria-label="Descripcion del segmento"
							placeholder="Descripcion"
							value={segmentForm.description}
							onChange={(event) =>
								setSegmentForm((current) => ({
									...current,
									description: event.target.value,
								}))
							}
							className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						/>
						<textarea
							aria-label="Criterios comerciales del segmento"
							placeholder="Criterios comerciales"
							value={segmentForm.criteria}
							onChange={(event) =>
								setSegmentForm((current) => ({
									...current,
									criteria: event.target.value,
								}))
							}
							className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						/>
						<div className="flex flex-wrap gap-2">
							<button
								type="submit"
								disabled={segmentSubmitPending}
								className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
							>
								{editingSegmentId ? "Guardar cambios" : "Crear segmento"}
							</button>
							{editingSegmentId ? (
								<button
									type="button"
									onClick={resetSegmentForm}
									className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600"
								>
									Cancelar edicion
								</button>
							) : null}
						</div>
					</form>

					<div className="grid gap-3 md:grid-cols-2">
						{segments.length ? (
							segments.map((segment) => (
								<article
									key={segment.id}
									className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm"
								>
									<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
										{segment.code}
									</p>
									<h3 className="mt-1 font-semibold text-slate-900">
										{segment.name}
									</h3>
									<p className="mt-2 text-sm text-slate-600">
										{segment.description ?? "Sin descripcion"}
									</p>
									{segment.criteria ? (
										<p className="mt-2 text-xs text-slate-500">
											Criterios: {segment.criteria}
										</p>
									) : null}
									<div className="mt-3 flex flex-wrap gap-2">
										<button
											type="button"
											onClick={() => startEditingSegment(segment)}
											className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600"
										>
											Editar
										</button>
										<button
											type="button"
											onClick={() => deleteSegment(segment.id)}
											disabled={pendingAction === `segment-${segment.id}`}
											className="rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700"
										>
											{confirmDeleteAction === `segment-${segment.id}`
												? "Confirmar eliminar"
												: "Eliminar"}
										</button>
									</div>
								</article>
							))
						) : (
							<p className="rounded-2xl border border-dashed border-slate-200 bg-white/75 p-4 text-sm text-slate-500">
								Sin segmentos registrados.
							</p>
						)}
					</div>
				</section>
			) : null}

			{activeTab === "assignments" ? (
				<section className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
					<form
						onSubmit={handleCreateAssignment}
						className="space-y-4 rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm"
					>
						<div>
							<h2 className="text-lg font-semibold text-slate-900">
								Asignar cliente a segmento
							</h2>
							<p className="text-sm text-slate-500">
								La segmentacion controla que promociones ve cada salon.
							</p>
						</div>
						<select
							aria-label="Cliente para asignar segmento"
							required
							value={assignmentForm.clientId}
							onChange={(event) =>
								setAssignmentForm((current) => ({
									...current,
									clientId: event.target.value,
								}))
							}
							className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						>
							<option value="">Selecciona cliente</option>
							{clients.map((client) => (
								<option key={client.id} value={client.id}>
									{client.name}
									{client.email ? ` - ${client.email}` : ""}
								</option>
							))}
						</select>
						<select
							aria-label="Segmento a asignar"
							required
							value={assignmentForm.segmentId}
							onChange={(event) =>
								setAssignmentForm((current) => ({
									...current,
									segmentId: event.target.value,
								}))
							}
							className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						>
							<option value="">Selecciona segmento</option>
							{segments.map((segment) => (
								<option key={segment.id} value={segment.id}>
									{segment.name}
								</option>
							))}
						</select>
						<textarea
							aria-label="Notas internas de la asignacion"
							placeholder="Notas internas"
							value={assignmentForm.notes}
							onChange={(event) =>
								setAssignmentForm((current) => ({
									...current,
									notes: event.target.value,
								}))
							}
							className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
						/>
						<button
							type="submit"
							disabled={pendingAction === "create-assignment"}
							className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
						>
							Asignar segmento
						</button>
					</form>

					<div className="space-y-3">
						{assignments.length ? (
							assignments.map((assignment) => (
								<article
									key={assignment.id}
									className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm"
								>
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<h3 className="font-semibold text-slate-900">
												{assignment.clientName}
											</h3>
											<p className="text-sm text-slate-500">
												{assignment.clientEmail ?? "Sin email"} -{" "}
												{assignment.segmentName}
											</p>
										</div>
										<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
											{assignment.segmentCode}
										</span>
									</div>
									{assignment.notes ? (
										<p className="mt-2 text-sm text-slate-600">
											{assignment.notes}
										</p>
									) : null}
									<button
										type="button"
										onClick={() => deleteAssignment(assignment.id)}
										disabled={pendingAction === `assignment-${assignment.id}`}
										className="mt-3 rounded-lg border border-rose-200 px-3 py-1 text-xs font-medium text-rose-700"
									>
										{confirmDeleteAction === `assignment-${assignment.id}`
											? "Confirmar quitar"
											: "Quitar asignacion"}
									</button>
								</article>
							))
						) : (
							<p className="rounded-2xl border border-dashed border-slate-200 bg-white/75 p-4 text-sm text-slate-500">
								Sin asignaciones registradas.
							</p>
						)}
					</div>
				</section>
			) : null}
		</div>
	);
}
