"use client";

import { useState } from "react";

type OrderableColorReference = {
	id: string;
	code: string;
	name: string;
	erpReference: string | null;
};

type ClientOption = {
	id: string;
	name: string;
	contactName: string | null;
};

type Props = {
	mode: "client" | "commercial";
	draftApiBasePath: string;
	productId: string;
	productName: string;
	productLineName: string | null;
	orderableColorReferences: OrderableColorReference[];
	clientOptions?: ClientOption[];
};

function buildColorReferenceLabel(reference: OrderableColorReference) {
	const parts = [
		reference.erpReference ?? reference.code,
		reference.erpReference && reference.erpReference !== reference.code
			? `tono ${reference.code}`
			: null,
		reference.name,
	].filter(Boolean);

	return parts.join(" · ");
}

export default function ProductOrderBox({
	mode,
	draftApiBasePath,
	productId,
	productName,
	productLineName,
	orderableColorReferences,
	clientOptions = [],
}: Props) {
	const [selectedClientId, setSelectedClientId] = useState(
		clientOptions[0]?.id ?? "",
	);
	const [selectedColorReferenceId, setSelectedColorReferenceId] = useState(
		orderableColorReferences[0]?.id ?? "",
	);
	const [quantity, setQuantity] = useState(1);
	const [submitting, setSubmitting] = useState(false);
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	const hasVariants = orderableColorReferences.length > 0;
	const isDisabledForCommercial = mode === "commercial" && clientOptions.length === 0;

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setFeedback(null);

		if (mode === "commercial" && !selectedClientId) {
			setFeedback({
				type: "error",
				message: "Selecciona un cliente para añadir esta línea al pedido en curso.",
			});
			return;
		}

		if (hasVariants && !selectedColorReferenceId) {
			setFeedback({
				type: "error",
				message: "Selecciona la referencia exacta de color antes de añadirla.",
			});
			return;
		}

		setSubmitting(true);

		try {
			const response = await fetch(`${draftApiBasePath}/draft/items`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					clientId: mode === "commercial" ? selectedClientId : undefined,
					productId,
					colorReferenceId: hasVariants ? selectedColorReferenceId : undefined,
					quantity,
				}),
			});
			const data = (await response.json().catch(() => null)) as
				| { id?: string; error?: string }
				| null;

			if (!response.ok) {
				setFeedback({
					type: "error",
					message:
						(data && "error" in data && data.error) ||
						"No se ha podido añadir la referencia al pedido en curso.",
				});
				return;
			}

			setFeedback({
				type: "success",
				message: "Línea añadida al pedido en curso correctamente.",
			});
		} catch (error) {
			console.error("[catalog][product-order-box] error:", error);
			setFeedback({
				type: "error",
				message:
					"Ha ocurrido un error inesperado al añadir la línea al pedido en curso.",
			});
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
			<div className="flex flex-col gap-2">
				<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
					Pedido
				</p>
				<h4 className="text-xl font-semibold text-slate-900">
					Añadir al pedido en curso
				</h4>
				<p className="text-sm leading-6 text-slate-600">
					{productLineName
						? `${productName} · ${productLineName}`
						: productName}
				</p>
			</div>

			{feedback ? (
				<div
					className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
						feedback.type === "success"
							? "border-emerald-200 bg-emerald-50 text-emerald-700"
							: "border-rose-200 bg-rose-50 text-rose-700"
					}`}
				>
					{feedback.message}
				</div>
			) : null}

			{isDisabledForCommercial ? (
				<div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-sm text-slate-600">
					No tienes clientes asignados ahora mismo, así que no puedes abrir un
					pedido desde esta ficha.
				</div>
			) : (
				<form onSubmit={handleSubmit} className="mt-4 space-y-4">
					{mode === "commercial" ? (
						<div>
							<label
								htmlFor="product-order-client"
								className="mb-2 block text-sm font-medium text-slate-700"
							>
								Cliente
							</label>
							<select
								id="product-order-client"
								value={selectedClientId}
								onChange={(event) => setSelectedClientId(event.target.value)}
								className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							>
								{clientOptions.map((client) => (
									<option key={client.id} value={client.id}>
										{client.name}
										{client.contactName ? ` · ${client.contactName}` : ""}
									</option>
								))}
							</select>
						</div>
					) : null}

					{hasVariants ? (
						<div>
							<label
								htmlFor="product-order-color-reference"
								className="mb-2 block text-sm font-medium text-slate-700"
							>
								Referencia exacta
							</label>
							<select
								id="product-order-color-reference"
								value={selectedColorReferenceId}
								onChange={(event) =>
									setSelectedColorReferenceId(event.target.value)
								}
								className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							>
								<option value="">Selecciona una referencia</option>
								{orderableColorReferences.map((reference) => (
									<option key={reference.id} value={reference.id}>
										{buildColorReferenceLabel(reference)}
									</option>
								))}
							</select>
						</div>
					) : null}

					<div className="grid gap-4 sm:grid-cols-[140px_auto] sm:items-end">
						<div>
							<label
								htmlFor="product-order-quantity"
								className="mb-2 block text-sm font-medium text-slate-700"
							>
								Cantidad
							</label>
							<input
								id="product-order-quantity"
								type="number"
								min={1}
								step={1}
								value={quantity}
								onChange={(event) => setQuantity(Number(event.target.value))}
								className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
							/>
						</div>

						<button
							type="submit"
							disabled={submitting}
							className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
						>
							{submitting ? "Añadiendo..." : "Añadir al pedido en curso"}
						</button>
					</div>
				</form>
			)}
		</div>
	);
}
