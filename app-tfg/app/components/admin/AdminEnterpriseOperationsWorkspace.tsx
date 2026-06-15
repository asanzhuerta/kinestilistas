"use client";

import { useState } from "react";
import PageTransition from "@/app/components/animations/PageTransition";
import SafeForm from "@/app/components/forms/SafeForm";
import SubmitButton from "@/app/components/forms/SubmitButton";
import H1Title from "@/app/components/H1Title";
import { requestJson } from "@/lib/api/client";
import type {
	CreateIntegrationOperationBody,
	EnterpriseOperationsSnapshot,
	GenerateSupplierOrderProposalBody,
} from "@/lib/contracts/enterprise-operations";
import type { ExternalIntegrationStatus } from "@/lib/typeorm/entities/ExternalIntegration";
import type { IntegrationOperationStatus } from "@/lib/typeorm/entities/IntegrationOperation";
import type { SupplierOrderProposalStatus } from "@/lib/typeorm/entities/SupplierOrderProposal";

type ProductOption = {
	id: string;
	name: string;
	reference: string;
};

type Props = {
	initialSnapshot: EnterpriseOperationsSnapshot;
	productOptions: ProductOption[];
};

const integrationStatusStyles: Record<ExternalIntegrationStatus, string> = {
	operational: "border-emerald-200 bg-emerald-50 text-emerald-700",
	degraded: "border-amber-200 bg-amber-50 text-amber-700",
	not_configured: "border-rose-200 bg-rose-50 text-rose-700",
	disabled: "border-slate-200 bg-slate-100 text-slate-600",
};

const operationStatusStyles: Record<IntegrationOperationStatus, string> = {
	pending: "border-amber-200 bg-amber-50 text-amber-700",
	success: "border-emerald-200 bg-emerald-50 text-emerald-700",
	failed: "border-rose-200 bg-rose-50 text-rose-700",
};

const proposalStatusStyles: Record<SupplierOrderProposalStatus, string> = {
	draft: "border-slate-200 bg-slate-100 text-slate-600",
	generated: "border-sky-200 bg-sky-50 text-sky-700",
	exported: "border-emerald-200 bg-emerald-50 text-emerald-700",
	archived: "border-slate-200 bg-slate-100 text-slate-600",
};

const enterpriseDateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
	dateStyle: "short",
	timeStyle: "short",
});

const enterpriseMoneyFormatter = new Intl.NumberFormat("es-ES", {
	style: "currency",
	currency: "EUR",
});

function formatDateTime(value: string | null) {
	if (!value) {
		return "Sin registros";
	}

	return enterpriseDateTimeFormatter.format(new Date(value));
}

function formatMoney(value: number) {
	return enterpriseMoneyFormatter.format(value);
}

function selectedValues(select: HTMLSelectElement) {
	return Array.from(select.selectedOptions).map((option) => option.value);
}

export default function AdminEnterpriseOperationsWorkspace({
	initialSnapshot,
	productOptions,
}: Props) {
	const [snapshot, setSnapshot] = useState(initialSnapshot);
	const [operationIntegrationId, setOperationIntegrationId] = useState(
		initialSnapshot.integrations[0]?.id ?? "",
	);
	const [operationType, setOperationType] = useState("export");
	const [operationDataType, setOperationDataType] = useState("orders");
	const [operationStatus, setOperationStatus] = useState("success");
	const [operationResult, setOperationResult] = useState(
		"Registro manual de prueba operativa",
	);
	const [proposalProductIds, setProposalProductIds] = useState<string[]>([]);
	const [proposalQuantity, setProposalQuantity] = useState("1");
	const [proposalReason, setProposalReason] = useState("reposición_manual");
	const [proposalNotes, setProposalNotes] = useState(
		"Propuesta generada desde M7 para revisar reposición a proveedor.",
	);
	const [savingOperation, setSavingOperation] = useState(false);
	const [generatingProposal, setGeneratingProposal] = useState(false);
	const [message, setMessage] = useState("");
	const [error, setError] = useState("");

	async function refreshSnapshot() {
		const nextSnapshot = await requestJson<EnterpriseOperationsSnapshot>(
			"/api/admin/enterprise-operations",
			{
				method: "GET",
				cache: "no-store",
				fallbackMessage: "No se pudo refrescar la operación empresarial",
			},
		);

		setSnapshot(nextSnapshot);
		return nextSnapshot;
	}

	async function handleOperationSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setSavingOperation(true);
		setError("");
		setMessage("");

		const payload: CreateIntegrationOperationBody = {
			integrationId: operationIntegrationId,
			operationType,
			dataType: operationDataType,
			status: operationStatus,
			result: operationResult,
		};

		try {
			await requestJson("/api/admin/enterprise-operations/operations", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
				fallbackMessage: "No se pudo registrar la operación",
			});
			await refreshSnapshot();
			setMessage("Operación de integración registrada correctamente.");
		} catch (requestError) {
			setError(
				requestError instanceof Error
					? requestError.message
					: "No se pudo registrar la operación",
			);
		} finally {
			setSavingOperation(false);
		}
	}

	async function handleProposalSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setGeneratingProposal(true);
		setError("");
		setMessage("");

		const payload: GenerateSupplierOrderProposalBody = {
			productIds: proposalProductIds,
			quantity: proposalQuantity,
			reason: proposalReason,
			notes: proposalNotes,
			status: "generated",
		};

		try {
			await requestJson(
				"/api/admin/enterprise-operations/supplier-proposals",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(payload),
					fallbackMessage: "No se pudo generar la propuesta",
				},
			);
			await refreshSnapshot();
			setMessage("Propuesta de pedido a proveedor generada correctamente.");
		} catch (requestError) {
			setError(
				requestError instanceof Error
					? requestError.message
					: "No se pudo generar la propuesta",
			);
		} finally {
			setGeneratingProposal(false);
		}
	}

	return (
		<PageTransition>
			<div className="space-y-6">
				<H1Title
					title="Operaciones empresariales"
					subtitle="Configuración, integraciones persistentes, sincronizaciones y propuestas de pedido a proveedor"
				/>

				<section className="glass-card rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur">
					<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
								M7 - Administración e integraciones
							</p>
							<h2 className="mt-2 text-2xl font-semibold text-slate-900">
								Registro operativo persistente
							</h2>
							<p className="mt-2 max-w-3xl text-sm text-slate-600">
								Esta vista materializa el bloque empresarial del modelo
								conceptual: parámetros de configuración, integraciones externas,
								operaciones de intercambio y propuestas de reposición.
							</p>
						</div>
					</div>
				</section>

				<section className="grid gap-4 md:grid-cols-4">
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">Configuraciones</p>
						<p className="mt-2 text-3xl font-semibold text-slate-900">
							{snapshot.summary.configurations}
						</p>
					</div>
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">Integraciones</p>
						<p className="mt-2 text-3xl font-semibold text-slate-900">
							{snapshot.summary.integrations}
						</p>
					</div>
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">Operaciones recientes</p>
						<p className="mt-2 text-3xl font-semibold text-slate-900">
							{snapshot.summary.operations}
						</p>
					</div>
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-5 shadow-lg backdrop-blur">
						<p className="text-sm text-slate-500">Propuestas abiertas</p>
						<p className="mt-2 text-3xl font-semibold text-slate-900">
							{snapshot.summary.openProposals}
						</p>
						<p className="mt-1 text-xs text-slate-500">
							{formatMoney(snapshot.summary.proposalAmount)}
						</p>
					</div>
				</section>

				{message ? (
					<div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
						{message}
					</div>
				) : null}
				{error ? (
					<div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
						{error}
					</div>
				) : null}

				<section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
					<SafeForm
						onSubmit={handleOperationSubmit}
						className="glass-card rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur"
					>
						<h2 className="text-xl font-semibold text-slate-900">
							Registrar operación
						</h2>
						<p className="mt-1 text-sm text-slate-600">
							Registra una exportación, sincronización o webhook vinculado a una
							integración externa.
						</p>

						<div className="mt-5 grid gap-4">
							<label className="grid gap-2 text-sm font-medium text-slate-700">
								Integración
								<select
									value={operationIntegrationId}
									onChange={(event) =>
										setOperationIntegrationId(event.target.value)
									}
									className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
									required
								>
									{snapshot.integrations.map((integration) => (
										<option key={integration.id} value={integration.id}>
											{integration.name}
										</option>
									))}
								</select>
							</label>

							<div className="grid gap-4 md:grid-cols-3">
								<label className="grid gap-2 text-sm font-medium text-slate-700">
									Tipo
									<select
										value={operationType}
										onChange={(event) => setOperationType(event.target.value)}
										className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
									>
										<option value="export">Exportación</option>
										<option value="import">Importación</option>
										<option value="sync">Sincronización</option>
										<option value="webhook">Webhook</option>
										<option value="manual">Manual</option>
									</select>
								</label>
								<label className="grid gap-2 text-sm font-medium text-slate-700">
									Dato
									<input
										value={operationDataType}
										onChange={(event) =>
											setOperationDataType(event.target.value)
										}
										className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
										required
									/>
								</label>
								<label className="grid gap-2 text-sm font-medium text-slate-700">
									Estado
									<select
										value={operationStatus}
										onChange={(event) => setOperationStatus(event.target.value)}
										className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
									>
										<option value="success">Correcta</option>
										<option value="pending">Pendiente</option>
										<option value="failed">Fallida</option>
									</select>
								</label>
							</div>

							<label className="grid gap-2 text-sm font-medium text-slate-700">
								Resultado
								<textarea
									value={operationResult}
									onChange={(event) => setOperationResult(event.target.value)}
									rows={3}
									className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
								/>
							</label>
						</div>

						<SubmitButton
							isSubmitting={savingOperation}
							submittingText="Registrando..."
							className="mt-5 bg-slate-900 font-semibold text-white shadow-sm hover:bg-slate-800"
						>
							Registrar operación
						</SubmitButton>
					</SafeForm>

					<SafeForm
						onSubmit={handleProposalSubmit}
						className="glass-card rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur"
					>
						<h2 className="text-xl font-semibold text-slate-900">
							Generar propuesta a proveedor
						</h2>
						<p className="mt-1 text-sm text-slate-600">
							Crea una propuesta persistente usando productos activos del
							catálogo. Si no seleccionas productos, usa una muestra reciente.
						</p>

						<div className="mt-5 grid gap-4">
							<label className="grid gap-2 text-sm font-medium text-slate-700">
								Productos
								<select
									multiple
									value={proposalProductIds}
									onChange={(event) =>
										setProposalProductIds(selectedValues(event.target))
									}
									className="min-h-36 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
								>
									{productOptions.map((product) => (
										<option key={product.id} value={product.id}>
											{product.reference} - {product.name}
										</option>
									))}
								</select>
							</label>

							<div className="grid gap-4 md:grid-cols-2">
								<label className="grid gap-2 text-sm font-medium text-slate-700">
									Cantidad por producto
									<input
										type="number"
										min="1"
										value={proposalQuantity}
										onChange={(event) =>
											setProposalQuantity(event.target.value)
										}
										className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
									/>
								</label>
								<label className="grid gap-2 text-sm font-medium text-slate-700">
									Motivo
									<input
										value={proposalReason}
										onChange={(event) => setProposalReason(event.target.value)}
										className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
									/>
								</label>
							</div>

							<label className="grid gap-2 text-sm font-medium text-slate-700">
								Notas
								<textarea
									value={proposalNotes}
									onChange={(event) => setProposalNotes(event.target.value)}
									rows={3}
									className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
								/>
							</label>
						</div>

						<SubmitButton
							isSubmitting={generatingProposal}
							submittingText="Generando..."
							className="mt-5 bg-slate-900 font-semibold text-white shadow-sm hover:bg-slate-800"
						>
							Generar propuesta
						</SubmitButton>
					</SafeForm>
				</section>

				<section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur">
						<h2 className="text-xl font-semibold text-slate-900">
							Integraciones externas persistidas
						</h2>
						<div className="mt-5 grid gap-4">
							{snapshot.integrations.map((integration) => (
								<article
									key={integration.id}
									className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
								>
									<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
										<div>
											<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
												{integration.integrationTypeLabel}
											</p>
											<h3 className="mt-1 text-lg font-semibold text-slate-900">
												{integration.name}
											</h3>
											<p className="mt-1 text-sm text-slate-600">
												{integration.description}
											</p>
										</div>
										<span
											className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${integrationStatusStyles[integration.status]}`}
										>
											{integration.statusLabel}
										</span>
									</div>
									<div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
										<p>
											Operaciones:{" "}
											<span className="font-semibold text-slate-900">
												{integration.operationsCount}
											</span>
										</p>
										<p>
											Última:{" "}
											<span className="font-semibold text-slate-900">
												{formatDateTime(integration.lastOperationAt)}
											</span>
										</p>
									</div>
								</article>
							))}
						</div>
					</div>

					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur">
						<h2 className="text-xl font-semibold text-slate-900">
							Configuración del sistema
						</h2>
						<div className="mt-5 divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-white">
							{snapshot.configurations.map((configuration) => (
								<div key={configuration.id} className="px-5 py-4">
									<p className="text-sm font-semibold text-slate-900">
										{configuration.key}
									</p>
									<p className="mt-1 text-sm text-slate-600">
										{configuration.value}
									</p>
									{configuration.description ? (
										<p className="mt-1 text-xs text-slate-500">
											{configuration.description}
										</p>
									) : null}
								</div>
							))}
						</div>
					</div>
				</section>

				<section className="grid gap-6 xl:grid-cols-2">
					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur">
						<h2 className="text-xl font-semibold text-slate-900">
							Operaciones recientes
						</h2>
						<div className="mt-5 space-y-3">
							{snapshot.recentOperations.length === 0 ? (
								<p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
									Todavía no hay operaciones registradas.
								</p>
							) : null}
							{snapshot.recentOperations.map((operation) => (
								<article
									key={operation.id}
									className="rounded-2xl border border-slate-200 bg-white px-4 py-3"
								>
									<div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
										<div>
											<p className="font-semibold text-slate-900">
												{operation.operationTypeLabel} -{" "}
												{operation.integrationName}
											</p>
											<p className="mt-1 text-sm text-slate-500">
												{operation.dataType} -{" "}
												{formatDateTime(operation.executedAt)}
											</p>
										</div>
										<span
											className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${operationStatusStyles[operation.status]}`}
										>
											{operation.statusLabel}
										</span>
									</div>
									{operation.result ? (
										<p className="mt-2 text-sm text-slate-600">
											{operation.result}
										</p>
									) : null}
								</article>
							))}
						</div>
					</div>

					<div className="glass-card rounded-3xl border border-white/30 bg-white/80 p-6 shadow-xl backdrop-blur">
						<h2 className="text-xl font-semibold text-slate-900">
							Propuestas a proveedor
						</h2>
						<div className="mt-5 space-y-4">
							{snapshot.proposals.length === 0 ? (
								<p className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
									Todavía no hay propuestas generadas.
								</p>
							) : null}
							{snapshot.proposals.map((proposal) => (
								<article
									key={proposal.id}
									className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
								>
									<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
										<div>
											<p className="text-sm font-semibold text-slate-900">
												{formatDateTime(proposal.generatedAt)}
											</p>
											<p className="mt-1 text-sm text-slate-500">
												{proposal.totalUnits} uds. -{" "}
												{formatMoney(proposal.totalAmount)}
											</p>
										</div>
										<span
											className={`w-fit rounded-full border px-3 py-1 text-xs font-semibold ${proposalStatusStyles[proposal.status]}`}
										>
											{proposal.statusLabel}
										</span>
									</div>
									{proposal.notes ? (
										<p className="mt-3 text-sm text-slate-600">
											{proposal.notes}
										</p>
									) : null}
									<div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3">
										<p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
											Líneas
										</p>
										<ul className="mt-2 space-y-1 text-sm text-slate-700">
											{proposal.lines.slice(0, 5).map((line) => (
												<li key={line.id}>
													{line.quantity} x {line.reference} -{" "}
													{line.description}
												</li>
											))}
										</ul>
									</div>
								</article>
							))}
						</div>
					</div>
				</section>
			</div>
		</PageTransition>
	);
}
