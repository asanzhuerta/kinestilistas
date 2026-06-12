"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import PageTransition from "@/app/components/animations/PageTransition";
import H1Title from "@/app/components/H1Title";
import { useSessionStorageState } from "@/app/hooks/useSessionStorageState";
import type {
	OrderFulfillmentMethod,
	OrderProductOption,
	OrderSummary,
} from "@/lib/contracts/order";
import { ROLE_IDS } from "@/lib/typeorm/constants/catalog-ids";
import { formatDateTime } from "@/lib/utils/user-utils";
import {
	formatOrderCents,
	formatOrderPercentage,
	getOrderDiscountSummary,
	getOrderPackageCount,
	getOrderPaymentStatusClasses,
} from "./order-ui";

type OrderClientOption = {
	id: string;
	name: string;
	contactName: string | null;
};

type EditableLine = {
	localId: string;
	productId: string;
	colorReferenceId: string | null;
	quantity: number;
};

type WorkspaceProps = {
	mode: "client" | "commercial";
	title: string;
	subtitle: string;
	backHref: string;
	apiPath: string;
	detailBasePath: string;
	productOptions: OrderProductOption[];
	agencyDeliveryFee?: string;
	initialOrders: OrderSummary[];
	initialDraftOrder?: OrderSummary | null;
	clientOptions?: OrderClientOption[];
	initialSelectedClientId?: string | null;
	initialCreatePanelOpen?: boolean;
	showOrderForm?: boolean;
	showHistory?: boolean;
	historyHref?: string;
};

function formatCurrency(amount: string) {
	const parsed = Number(amount);

	if (!Number.isFinite(parsed)) {
		return amount;
	}

	return parsed.toLocaleString("es-ES", {
		style: "currency",
		currency: "EUR",
	});
}

function parseMoneyToCents(amount: string | null | undefined) {
	const parsed = Number(amount);

	if (!Number.isFinite(parsed) || parsed < 0) {
		return 0;
	}

	return Math.round(parsed * 100);
}

function parseDiscountPercentage(value: string | number | null | undefined) {
	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) {
		return 0;
	}

	return parsed;
}

function applyDiscountToCents(amountCents: number, discountPercentage: number) {
	const basisPoints = Math.round(discountPercentage * 100);

	return Math.max(
		0,
		Math.round((amountCents * (10_000 - basisPoints)) / 10_000),
	);
}

function getOrderStatusClasses(statusCode: string) {
	switch (statusCode) {
		case "draft":
			return "bg-slate-100 text-slate-700";
		case "created":
			return "bg-amber-100 text-amber-700";
		case "confirmed":
			return "bg-sky-100 text-sky-700";
		case "delivered":
			return "bg-emerald-100 text-emerald-700";
		case "cancelled":
			return "bg-rose-100 text-rose-700";
		default:
			return "bg-slate-100 text-slate-700";
	}
}

function buildProductLabel(product: OrderProductOption) {
	const contextParts = [
		product.productLineName,
		product.colorReferenceCode && product.colorReferenceCode !== product.orderReference
			? `tono ${product.colorReferenceCode}`
			: null,
		product.colorReferenceName,
	].filter(Boolean);

	return `${product.orderReference} · ${product.name}${
		contextParts.length > 0 ? ` · ${contextParts.join(" / ")}` : ""
	}`;
}

function normalizeProductSearchTerm(value: string) {
	return value
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.trim();
}

function buildProductSearchIndex(product: OrderProductOption) {
	return normalizeProductSearchTerm(
		[
			buildProductLabel(product),
			product.name,
			product.reference,
			product.orderReference,
			product.colorReferenceCode,
			product.colorReferenceName,
			product.productCategoryName,
			product.productLineName,
			product.format,
			product.discountTitle,
			product.discountBenefit,
		]
			.filter(Boolean)
			.join(" "),
	);
}

function filterProductOptions(
	productOptions: OrderProductOption[],
	searchTerm: string,
	selectedProductOption: OrderProductOption | null,
) {
	const normalizedSearchTerm = normalizeProductSearchTerm(searchTerm);

	if (!normalizedSearchTerm) {
		return productOptions;
	}

	const searchTokens = normalizedSearchTerm.split(/\s+/).filter(Boolean);
	const filteredOptions = productOptions.filter((productOption) => {
		const searchIndex = buildProductSearchIndex(productOption);

		return searchTokens.every((token) => searchIndex.includes(token));
	});

	if (
		selectedProductOption &&
		!filteredOptions.some((option) => option.id === selectedProductOption.id)
	) {
		return [selectedProductOption, ...filteredOptions];
	}

	return filteredOptions;
}

function createEmptyLine(localId = `line-${Date.now()}`): EditableLine {
	return {
		localId,
		productId: "",
		colorReferenceId: null,
		quantity: 1,
	};
}

function buildSelectionValue(
	productId: string,
	colorReferenceId: string | null | undefined,
) {
	const normalizedProductId = String(productId ?? "").trim();
	const normalizedColorReferenceId = String(colorReferenceId ?? "").trim();

	if (!normalizedProductId) {
		return "";
	}

	return normalizedColorReferenceId
		? `${normalizedProductId}::${normalizedColorReferenceId}`
		: normalizedProductId;
}

function findSelectedProductOption(
	line: EditableLine,
	productOptions: OrderProductOption[],
) {
	const selectionValue = buildSelectionValue(
		line.productId,
		line.colorReferenceId,
	);

	return productOptions.find((option) => option.id === selectionValue) ?? null;
}

function buildLinePreview(
	line: EditableLine,
	productOption: OrderProductOption | null,
) {
	if (!productOption) {
		return null;
	}

	const quantity = Math.max(1, Number(line.quantity) || 1);
	const unitPriceCents = parseMoneyToCents(productOption.basePrice);
	const subtotalCents = unitPriceCents * quantity;
	const discountPercentage = parseDiscountPercentage(
		productOption.discountPercentage,
	);
	const totalCents =
		discountPercentage > 0
			? applyDiscountToCents(subtotalCents, discountPercentage)
			: subtotalCents;

	return {
		quantity,
		unitPriceCents,
		subtotalCents,
		discountPercentage,
		discountCents: Math.max(0, subtotalCents - totalCents),
		totalCents,
		hasDiscount: discountPercentage > 0 && subtotalCents > totalCents,
	};
}

function mapOrderToEditableLines(order: OrderSummary | null | undefined) {
	const mappedLines =
		order?.lines.map((line, index) => ({
			localId: `line-${index + 1}-${line.id}`,
			productId: line.product_id,
			colorReferenceId: line.color_reference_id ?? null,
			quantity: line.quantity,
		})) ?? [];

	return mappedLines.length > 0 ? mappedLines : [createEmptyLine("line-1")];
}

function isOrderOpenWithoutPayment(order: OrderSummary) {
	return (
		order.status_code !== "draft" &&
		order.status_code !== "cancelled" &&
		order.payment_status_code !== "paid"
	);
}

function matchesOrderSearch(order: OrderSummary, searchTerm: string) {
	const normalizedSearchTerm = searchTerm.trim().toLowerCase();

	if (!normalizedSearchTerm) {
		return true;
	}

	return [
		order.id,
		order.client_name,
		order.created_by_user_name,
		order.notes ?? "",
		...order.lines.map((line) => `${line.order_reference} ${line.product_name}`),
	]
		.join(" ")
		.toLowerCase()
		.includes(normalizedSearchTerm);
}

function getLocalDateInputValue(value: string | null | undefined) {
	const date = new Date(String(value ?? ""));

	if (Number.isNaN(date.getTime())) {
		return "";
	}

	const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);

	return localDate.toISOString().slice(0, 10);
}

function isOrderInsideDateRange(
	order: OrderSummary,
	dateFrom: string,
	dateTo: string,
) {
	const orderDate = getLocalDateInputValue(order.created_at);

	if (!orderDate) {
		return false;
	}

	if (dateFrom && orderDate < dateFrom) {
		return false;
	}

	if (dateTo && orderDate > dateTo) {
		return false;
	}

	return true;
}

export default function OrderWorkspace({
	mode,
	title,
	subtitle,
	apiPath,
	detailBasePath,
	productOptions,
	agencyDeliveryFee = "8.00",
	initialOrders,
	initialDraftOrder = null,
	clientOptions = [],
	initialSelectedClientId,
	initialCreatePanelOpen = false,
	showOrderForm = true,
	showHistory = true,
	historyHref,
}: WorkspaceProps) {
	const initialCommercialClientId =
		initialSelectedClientId ?? clientOptions[0]?.id ?? "";
	const [orders, setOrders] = useState(initialOrders);
	const [lines, setLines] = useState<EditableLine[]>(
		mapOrderToEditableLines(initialDraftOrder),
	);
	const [productSearchByLineId, setProductSearchByLineId] = useState<
		Record<string, string>
	>({});
	const [currentProductOptions, setCurrentProductOptions] =
		useState(productOptions);
	const [selectedClientId, setSelectedClientId] = useState(
		initialCommercialClientId,
	);
	const [fulfillmentMethod, setFulfillmentMethod] =
		useState<OrderFulfillmentMethod>(
			initialDraftOrder?.fulfillment_method === "agency"
				? "agency"
				: "commercial",
		);
	const [notes, setNotes] = useState(initialDraftOrder?.notes ?? "");
	const [submitting, setSubmitting] = useState(false);
	const [savingDraft, setSavingDraft] = useState(false);
	const [clearingDraft, setClearingDraft] = useState(false);
	const [loadingDraft, setLoadingDraft] = useState(false);
	const [loadingProductOptions, setLoadingProductOptions] = useState(false);
	const workspaceHistoryFilterKey = `order-workspace-history:${mode}:${detailBasePath}`;
	const [historyClientFilter, setHistoryClientFilter] = useSessionStorageState(
		`${workspaceHistoryFilterKey}:client`,
		"all",
	);
	const [historyPaymentFilter, setHistoryPaymentFilter] =
		useSessionStorageState(`${workspaceHistoryFilterKey}:payment`, "all");
	const [historySearch, setHistorySearch] = useSessionStorageState(
		`${workspaceHistoryFilterKey}:search`,
		"",
	);
	const [historyStatusFilter, setHistoryStatusFilter] = useSessionStorageState(
		`${workspaceHistoryFilterKey}:status`,
		"all",
	);
	const [historyDateFromFilter, setHistoryDateFromFilter] =
		useSessionStorageState(`${workspaceHistoryFilterKey}:dateFrom`, "");
	const [historyDateToFilter, setHistoryDateToFilter] = useSessionStorageState(
		`${workspaceHistoryFilterKey}:dateTo`,
		"",
	);
	const [isHistoryFiltersOpen, setIsHistoryFiltersOpen] = useState(false);
	const [isCreatePanelOpen, setIsCreatePanelOpen] = useState(
		mode !== "commercial" || initialCreatePanelOpen,
	);
	const [feedback, setFeedback] = useState<{
		type: "success" | "error";
		message: string;
	} | null>(null);

	const selectedClientOrders = useMemo(
		() =>
			selectedClientId
				? orders.filter((order) => order.client_id === selectedClientId)
				: [],
		[orders, selectedClientId],
	);
	const selectedClientOpenOrdersCount = useMemo(
		() =>
			selectedClientOrders.filter((order) => isOrderOpenWithoutPayment(order))
				.length,
		[selectedClientOrders],
	);
	const orderLimitReached =
		mode === "commercial"
			? Boolean(selectedClientId) &&
				selectedClientOpenOrdersCount >= 2
			: orders.filter((order) => isOrderOpenWithoutPayment(order)).length >= 2;
	const visibleOrders = useMemo(() => {
		return orders.filter((order) => {
			if (
				mode === "commercial" &&
				historyClientFilter !== "all" &&
				order.client_id !== historyClientFilter
			) {
				return false;
			}

			if (
				historyStatusFilter !== "all" &&
				order.status_code !== historyStatusFilter
			) {
				return false;
			}

			if (
				historyPaymentFilter !== "all" &&
				order.payment_status_code !== historyPaymentFilter
			) {
				return false;
			}

			if (
				!isOrderInsideDateRange(
					order,
					historyDateFromFilter,
					historyDateToFilter,
				)
			) {
				return false;
			}

			return matchesOrderSearch(order, historySearch);
		});
	}, [
		historyClientFilter,
		historyDateFromFilter,
		historyDateToFilter,
		historyPaymentFilter,
		historySearch,
		historyStatusFilter,
		mode,
		orders,
	]);
	const hasHistoryFilters =
		historySearch.trim().length > 0 ||
		historyStatusFilter !== "all" ||
		historyPaymentFilter !== "all" ||
		historyDateFromFilter ||
		historyDateToFilter ||
		(mode === "commercial" && historyClientFilter !== "all");
	const summaryCounts = useMemo(() => {
		const blockedClients = new Set(
			clientOptions
				.filter((client) => {
					const clientOpenOrdersCount = orders.filter(
						(order) =>
							order.client_id === client.id && isOrderOpenWithoutPayment(order),
					).length;

					return clientOpenOrdersCount >= 2;
				})
				.map((client) => client.id),
		);

		return {
			blockedClients: blockedClients.size,
			deliveredPendingPayment: orders.filter(
				(order) =>
					order.status_code === "delivered" &&
					order.payment_status_code !== "paid",
			).length,
			openOrders: orders.filter(
				(order) =>
					order.status_code === "created" || order.status_code === "confirmed",
			).length,
			paidOrders: orders.filter(
				(order) => order.payment_status_code === "paid",
			).length,
		};
	}, [clientOptions, orders]);
	const orderLineLabel = mode === "client" ? "Producto" : "Bulto";
	const addLineLabel =
		mode === "client" ? "Añadir nuevo producto" : "Añadir bulto";
	const agencyDeliveryFeeCents = parseMoneyToCents(agencyDeliveryFee);
	const orderPreview = useMemo(() => {
		const lineTotals = lines.reduce(
			(accumulator, line) => {
				const selectedProductOption = findSelectedProductOption(
					line,
					currentProductOptions,
				);
				const linePreview = buildLinePreview(line, selectedProductOption);

				if (!linePreview) {
					return accumulator;
				}

				return {
					subtotalCents: accumulator.subtotalCents + linePreview.subtotalCents,
					discountCents: accumulator.discountCents + linePreview.discountCents,
					totalCents: accumulator.totalCents + linePreview.totalCents,
				};
			},
			{
				subtotalCents: 0,
				discountCents: 0,
				totalCents: 0,
			},
		);
		const deliveryFeeCents =
			fulfillmentMethod === "agency" ? agencyDeliveryFeeCents : 0;

		return {
			...lineTotals,
			deliveryFeeCents,
			finalTotalCents: lineTotals.totalCents + deliveryFeeCents,
		};
	}, [
		agencyDeliveryFeeCents,
		currentProductOptions,
		fulfillmentMethod,
		lines,
	]);

	function syncDraftState(nextDraftOrder: OrderSummary | null) {
		setNotes(nextDraftOrder?.notes ?? "");
		setFulfillmentMethod(
			nextDraftOrder?.fulfillment_method === "agency"
				? "agency"
				: "commercial",
		);
		setLines(mapOrderToEditableLines(nextDraftOrder));
		setProductSearchByLineId({});
	}

	function resetHistoryFilters() {
		setHistorySearch("");
		setHistoryClientFilter("all");
		setHistoryStatusFilter("all");
		setHistoryPaymentFilter("all");
		setHistoryDateFromFilter("");
		setHistoryDateToFilter("");
	}

	useEffect(() => {
		setCurrentProductOptions(productOptions);
	}, [productOptions]);

	useEffect(() => {
		if (mode !== "client" || !showOrderForm) {
			return;
		}

		let isCancelled = false;

		async function loadDraft() {
			setLoadingDraft(true);

			try {
				const response = await fetch(`${apiPath}/draft`, {
					method: "GET",
					cache: "no-store",
				});
				const data = (await response.json().catch(() => null)) as
					| OrderSummary
					| { error?: string }
					| null;

				if (isCancelled) {
					return;
				}

				if (!response.ok) {
					setFeedback({
						type: "error",
						message:
							(data && "error" in data && data.error) ||
							"No se ha podido cargar el pedido en curso.",
					});
					return;
				}

				syncDraftState(data && "id" in data ? data : null);
			} catch (error) {
				console.error("[orders][client-draft][load] error:", error);

				if (!isCancelled) {
					setFeedback({
						type: "error",
						message:
							"Ha ocurrido un error inesperado al cargar el pedido en curso.",
					});
				}
			} finally {
				if (!isCancelled) {
					setLoadingDraft(false);
				}
			}
		}

		loadDraft();

		return () => {
			isCancelled = true;
		};
	}, [apiPath, mode, showOrderForm]);

	useEffect(() => {
		if (mode !== "commercial") {
			return;
		}

		if (!selectedClientId) {
			setCurrentProductOptions(productOptions);
			return;
		}

		let isCancelled = false;

		async function loadProductOptions() {
			setLoadingProductOptions(true);

			try {
				const response = await fetch(
					`${apiPath}/product-options?clientId=${encodeURIComponent(
						selectedClientId,
					)}`,
					{
						method: "GET",
						cache: "no-store",
					},
				);
				const data = (await response.json().catch(() => null)) as
					| OrderProductOption[]
					| { error?: string }
					| null;

				if (isCancelled) {
					return;
				}

				if (!response.ok || !Array.isArray(data)) {
					setFeedback({
						type: "error",
						message:
							(data && "error" in data && data.error) ||
							"No se han podido cargar las promociones de este cliente.",
					});
					return;
				}

				setCurrentProductOptions(data);
			} catch (error) {
				console.error("[orders][product-options][load] error:", error);

				if (!isCancelled) {
					setFeedback({
						type: "error",
						message:
							"Ha ocurrido un error inesperado al cargar las promociones del cliente.",
					});
				}
			} finally {
				if (!isCancelled) {
					setLoadingProductOptions(false);
				}
			}
		}

		loadProductOptions();

		return () => {
			isCancelled = true;
		};
	}, [apiPath, mode, productOptions, selectedClientId]);

	useEffect(() => {
		if (mode !== "commercial") {
			return;
		}

		if (!selectedClientId) {
			syncDraftState(null);
			return;
		}

		let isCancelled = false;

		async function loadDraft() {
			setLoadingDraft(true);

			try {
				const response = await fetch(
					`${apiPath}/draft?clientId=${encodeURIComponent(selectedClientId)}`,
					{
						method: "GET",
						cache: "no-store",
					},
				);
				const data = (await response.json().catch(() => null)) as
					| OrderSummary
					| { error?: string }
					| null;

				if (isCancelled) {
					return;
				}

				if (!response.ok) {
					setFeedback({
						type: "error",
						message:
							(data && "error" in data && data.error) ||
							"No se ha podido cargar el pedido en curso de este cliente.",
					});
					return;
				}

				syncDraftState(data && "id" in data ? data : null);
			} catch (error) {
				console.error("[orders][draft][load] error:", error);

				if (!isCancelled) {
					setFeedback({
						type: "error",
						message:
							"Ha ocurrido un error inesperado al cargar el pedido en curso.",
					});
				}
			} finally {
				if (!isCancelled) {
					setLoadingDraft(false);
				}
			}
		}

		loadDraft();

		return () => {
			isCancelled = true;
		};
	}, [apiPath, mode, selectedClientId]);

	function updateLine(localId: string, updates: Partial<EditableLine>) {
		setLines((currentLines) =>
			currentLines.map((line) =>
				line.localId === localId ? { ...line, ...updates } : line,
			),
		);
	}

	function updateProductSearch(localId: string, searchTerm: string) {
		setProductSearchByLineId((currentSearches) => ({
			...currentSearches,
			[localId]: searchTerm,
		}));
	}

	function updateSelectedOption(localId: string, optionId: string) {
		const selectedOption = currentProductOptions.find(
			(option) => option.id === optionId,
		);

		updateLine(localId, {
			productId: selectedOption?.productId ?? "",
			colorReferenceId: selectedOption?.colorReferenceId ?? null,
		});
	}

	function addLine() {
		setLines((currentLines) => [
			...currentLines,
			createEmptyLine(`line-${Date.now()}-${currentLines.length + 1}`),
		]);
	}

	function removeLine(localId: string) {
		setLines((currentLines) =>
			currentLines.length === 1
				? currentLines
				: currentLines.filter((line) => line.localId !== localId),
		);
		setProductSearchByLineId((currentSearches) => {
			const nextSearches = { ...currentSearches };
			delete nextSearches[localId];

			return nextSearches;
		});
	}

	function buildPayloadLines() {
		return lines.map((line) => ({
			productId: line.productId,
			colorReferenceId: line.colorReferenceId,
			quantity: line.quantity,
		}));
	}

	async function handleSaveDraft() {
		setFeedback(null);

		if (mode === "commercial" && !selectedClientId) {
			setFeedback({
				type: "error",
				message: "Selecciona primero un cliente asignado para guardar el pedido.",
			});
			return;
		}

		setSavingDraft(true);

		try {
			const response = await fetch(`${apiPath}/draft`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					clientId: mode === "commercial" ? selectedClientId : undefined,
					fulfillmentMethod,
					notes,
					lines: buildPayloadLines(),
				}),
			});
			const data = (await response.json().catch(() => null)) as
				| OrderSummary
				| { error?: string }
				| null;

			if (!response.ok) {
				setFeedback({
					type: "error",
					message:
						(data && "error" in data && data.error) ||
						"No se ha podido guardar el pedido en curso.",
				});
				return;
			}

			syncDraftState(data && "id" in data ? data : null);
			setFeedback({
				type: "success",
				message:
					data && "id" in data
						? "Pedido en curso guardado correctamente."
						: "El pedido en curso se ha vaciado correctamente.",
			});
		} catch (error) {
			console.error("[orders][draft][save] error:", error);
			setFeedback({
				type: "error",
				message: "Ha ocurrido un error inesperado al guardar el pedido en curso.",
			});
		} finally {
			setSavingDraft(false);
		}
	}

	async function handleClearDraft() {
		setFeedback(null);

		if (mode === "commercial" && !selectedClientId) {
			setFeedback({
				type: "error",
				message: "Selecciona primero un cliente asignado para vaciar el pedido.",
			});
			return;
		}

		setClearingDraft(true);

		try {
			const draftPath =
				mode === "commercial"
					? `${apiPath}/draft?clientId=${encodeURIComponent(selectedClientId)}`
					: `${apiPath}/draft`;
			const response = await fetch(draftPath, {
				method: "DELETE",
			});
			const data = (await response.json().catch(() => null)) as
				| { ok?: boolean; error?: string }
				| null;

			if (!response.ok) {
				setFeedback({
					type: "error",
					message:
						(data && "error" in data && data.error) ||
						"No se ha podido vaciar el pedido en curso.",
				});
				return;
			}

			syncDraftState(null);
			setFeedback({
				type: "success",
				message: "El pedido en curso se ha vaciado correctamente.",
			});
		} catch (error) {
			console.error("[orders][draft][clear] error:", error);
			setFeedback({
				type: "error",
				message: "Ha ocurrido un error inesperado al vaciar el pedido en curso.",
			});
		} finally {
			setClearingDraft(false);
		}
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setFeedback(null);

		if (mode === "commercial" && !selectedClientId) {
			setFeedback({
				type: "error",
				message: "Selecciona primero un cliente asignado para registrar el pedido.",
			});
			return;
		}

		if (orderLimitReached) {
			setFeedback({
				type: "error",
				message:
					mode === "commercial"
						? "Este cliente ya tiene 2 pedidos registrados pendientes de cobro. Debes cerrar al menos uno antes de crear otro."
						: "Ya tienes 2 pedidos registrados pendientes de cobro. Debes cerrar al menos uno antes de crear otro.",
			});
			return;
		}

		setSubmitting(true);

		try {
			const response = await fetch(apiPath, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					clientId: mode === "commercial" ? selectedClientId : undefined,
					fulfillmentMethod,
					notes,
					lines: buildPayloadLines(),
				}),
			});

			const data = (await response.json().catch(() => null)) as
				| OrderSummary
				| { error?: string }
				| null;

			if (!response.ok || !data || !("id" in data)) {
				setFeedback({
					type: "error",
					message:
						(data && "error" in data && data.error) ||
						"No se ha podido registrar el pedido.",
				});
				return;
			}

			setOrders((currentOrders) => [data, ...currentOrders]);
			syncDraftState(null);
			if (mode === "commercial") {
				setIsCreatePanelOpen(false);
			}
			setFeedback({
				type: "success",
				message: `Pedido registrado correctamente por un total de ${formatCurrency(
					data.total_amount,
				)}.`,
			});
		} catch (error) {
			console.error("[orders][submit] error:", error);
			setFeedback({
				type: "error",
				message: "Ha ocurrido un error inesperado al registrar el pedido.",
			});
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<PageTransition>
			<div className="space-y-6">
				<H1Title title={title} subtitle={subtitle} />

				{mode === "commercial" ? (
					<section className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
						<div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
							<div className="flex flex-wrap items-center gap-2 text-xs text-slate-700 sm:text-sm">
								<span className="font-semibold uppercase tracking-[0.18em] text-slate-500">
									Resumen
								</span>
								<span className="rounded-full bg-sky-50 px-3 py-2 font-semibold text-sky-800">
									Abiertos {summaryCounts.openOrders}
								</span>
								<span className="rounded-full bg-amber-50 px-3 py-2 font-semibold text-amber-800">
									Pendientes de cobro {summaryCounts.deliveredPendingPayment}
								</span>
								<span className="rounded-full bg-emerald-50 px-3 py-2 font-semibold text-emerald-800">
									Cobrados {summaryCounts.paidOrders}
								</span>
								<span className="rounded-full bg-rose-50 px-3 py-2 font-semibold text-rose-800">
									Clientes bloqueados {summaryCounts.blockedClients}
								</span>
							</div>
							<button
								type="button"
								onClick={() =>
									setIsCreatePanelOpen((currentValue) => !currentValue)
								}
								disabled={clientOptions.length === 0}
								className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
							>
								{isCreatePanelOpen ? "Cerrar alta de pedido" : "Nuevo pedido"}
							</button>
						</div>
					</section>
				) : null}

				{mode === "commercial" && feedback ? (
					<div
						className={`rounded-2xl border px-4 py-3 text-sm shadow-sm ${
							feedback.type === "success"
								? "border-emerald-200 bg-emerald-50 text-emerald-700"
								: "border-rose-200 bg-rose-50 text-rose-700"
						}`}
					>
						{feedback.message}
					</div>
				) : null}

				{showOrderForm && (mode !== "commercial" || isCreatePanelOpen) ? (
					<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<div className="flex flex-col gap-2">
							<h2 className="text-3xl font-semibold uppercase text-slate-900">
								Pedido en curso
							</h2>
							<p className="text-sm font-medium text-slate-500">(borrador)</p>
							<p
								className={
									mode === "client"
										? "hidden"
										: "max-w-2xl text-sm leading-6 text-slate-600"
								}
							>
								{mode === "client"
									? "Prepara un pedido en curso, guárdalo como borrador si lo necesitas y confirma el pedido cuando esté listo. En coloración podrás trabajar con la referencia exacta."
									: "Trabaja con pedidos en curso por cliente asignado, guarda borradores y registra el pedido final cuando cierres la selección de referencias y cantidades."}
							</p>
						</div>

						{historyHref ? (
							<Link
								href={historyHref}
								className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
							>
								Ver historial de pedidos
							</Link>
						) : mode === "commercial" ? (
							<button
								type="button"
								onClick={() => setIsCreatePanelOpen((currentValue) => !currentValue)}
								className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
							>
								{isCreatePanelOpen ? "Ocultar formulario" : "Nuevo pedido"}
							</button>
						) : null}
					</div>

					{feedback && mode !== "commercial" ? (
						<div
							className={`mt-5 rounded-2xl border px-4 py-3 text-sm shadow-sm ${
								feedback.type === "success"
									? "border-emerald-200 bg-emerald-50 text-emerald-700"
									: "border-rose-200 bg-rose-50 text-rose-700"
							}`}
						>
							{feedback.message}
						</div>
					) : null}

					{mode === "commercial" && clientOptions.length === 0 ? (
						<div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-6 text-sm text-slate-600">
							No tienes clientes asignados ahora mismo, así que todavía no
							puedes registrar pedidos desde el área comercial.
						</div>
					) : mode === "commercial" && !isCreatePanelOpen ? (
						<div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-6 text-sm text-slate-600">
							Abre el formulario solo cuando necesites registrar un nuevo
							pedido o retomar un borrador.
						</div>
					) : (
						<form onSubmit={handleSubmit} className="mt-5 space-y-5">
							{mode === "commercial" ? (
								<div>
									<label
										htmlFor="order-client"
										className="mb-2 block text-sm font-medium text-slate-700"
									>
										Cliente
									</label>
									<select
										id="order-client"
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

							{orderLimitReached ? (
								<div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-700">
									{mode === "commercial"
										? `Este cliente ya tiene ${selectedClientOpenOrdersCount} pedidos registrados pendientes de cobro. No puedes registrar otro hasta cerrar al menos uno.`
										: "Ya tienes 2 pedidos registrados pendientes de cobro. No puedes registrar otro hasta cerrar al menos uno."}
								</div>
							) : null}

							{loadingDraft ? (
								<div className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm text-slate-600">
									Cargando pedido en curso...
								</div>
							) : null}

							{loadingProductOptions ? (
								<div className="rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm text-sky-700">
									Actualizando promociones del cliente...
								</div>
							) : null}

							<div className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 lg:grid-cols-[minmax(0,1fr)_260px]">
								<div>
									<p className="text-sm font-semibold text-slate-900">
										Entrega del pedido
									</p>
									<div className="mt-3 grid gap-2 sm:grid-cols-2">
										{[
											{
												value: "commercial" as const,
												title: "Comercial",
												description: "Se planifica como reparto comercial.",
											},
											{
												value: "agency" as const,
												title: "Agencia",
												description: `Suma ${formatOrderCents(
													agencyDeliveryFeeCents,
												)} al pedido y genera etiqueta de agencia.`,
											},
										].map((option) => (
											<label
												key={option.value}
												className={`cursor-pointer rounded-2xl border px-4 py-3 transition ${
													fulfillmentMethod === option.value
														? "border-slate-950 bg-slate-950 text-white"
														: "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
												}`}
											>
												<input
													type="radio"
													name="fulfillmentMethod"
													value={option.value}
													checked={fulfillmentMethod === option.value}
													onChange={() => setFulfillmentMethod(option.value)}
													className="sr-only"
												/>
												<span className="block text-sm font-semibold">
													{option.title}
												</span>
												<span
													className={`mt-1 block text-xs ${
														fulfillmentMethod === option.value
															? "text-slate-200"
															: "text-slate-500"
													}`}
												>
													{option.description}
												</span>
											</label>
										))}
									</div>
								</div>

								<div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
									<div className="flex items-center justify-between gap-3 text-slate-600">
										<span>Productos</span>
										<span className="font-semibold text-slate-900">
											{formatOrderCents(orderPreview.totalCents)}
										</span>
									</div>
									{orderPreview.discountCents > 0 ? (
										<div className="mt-2 flex items-center justify-between gap-3 text-emerald-700">
											<span>Descuento aplicado</span>
											<span className="font-semibold">
												-{formatOrderCents(orderPreview.discountCents)}
											</span>
										</div>
									) : null}
									{orderPreview.deliveryFeeCents > 0 ? (
										<div className="mt-2 flex items-center justify-between gap-3 text-slate-600">
											<span>Cargo agencia</span>
											<span className="font-semibold text-slate-900">
												{formatOrderCents(orderPreview.deliveryFeeCents)}
											</span>
										</div>
									) : null}
									<div className="mt-3 border-t border-slate-100 pt-3">
										<div className="flex items-center justify-between gap-3 text-base font-semibold text-slate-950">
											<span>Total estimado</span>
											<span>
												{formatOrderCents(orderPreview.finalTotalCents)}
											</span>
										</div>
									</div>
								</div>
							</div>

							<div className="space-y-3">
								{lines.map((line, index) => {
									const selectedProductOption = findSelectedProductOption(
										line,
										currentProductOptions,
									);
									const productSearchValue =
										productSearchByLineId[line.localId] ?? "";
									const visibleProductOptions = filterProductOptions(
										currentProductOptions,
										productSearchValue,
										selectedProductOption,
									);
									const linePreview = buildLinePreview(
										line,
										selectedProductOption,
									);

									return (
										<div
											key={line.localId}
											className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 md:grid-cols-[84px_minmax(0,1fr)_140px_auto]"
										>
											<div className="relative h-20 w-20 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
												{selectedProductOption?.imageUrl ? (
													<Image
														src={selectedProductOption.imageUrl}
														alt={selectedProductOption.name}
														fill
														className="object-contain p-2"
														sizes="80px"
													/>
												) : (
													<div className="flex h-full items-center justify-center px-2 text-center text-[11px] font-medium text-slate-400">
														Sin imagen
													</div>
												)}
											</div>

											<div>
												<div className="grid gap-3 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
													<div>
														<label
															htmlFor={`order-product-search-${line.localId}`}
															className="mb-2 block text-sm font-medium text-slate-700"
														>
															Buscar producto
														</label>
														<input
															id={`order-product-search-${line.localId}`}
															type="search"
															value={productSearchValue}
															onChange={(event) =>
																updateProductSearch(
																	line.localId,
																	event.target.value,
																)
															}
															placeholder="Nombre, referencia, tono o línea"
															className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
														/>
													</div>

													<div>
														<label
															htmlFor={`order-product-${line.localId}`}
															className="mb-2 block text-sm font-medium text-slate-700"
														>
															{orderLineLabel} {index + 1}
														</label>
														<select
															id={`order-product-${line.localId}`}
															value={buildSelectionValue(
																line.productId,
																line.colorReferenceId,
															)}
															onChange={(event) =>
																updateSelectedOption(
																	line.localId,
																	event.target.value,
																)
															}
															className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
														>
															<option value="">
																Selecciona una referencia
															</option>
															{visibleProductOptions.map((product) => (
																<option key={product.id} value={product.id}>
																	{buildProductLabel(product)}
																</option>
															))}
														</select>
													</div>
												</div>

												{productSearchValue.trim() &&
												visibleProductOptions.length === 0 ? (
													<p className="mt-2 text-xs font-medium text-slate-500">
														No hay referencias que coincidan con la búsqueda.
													</p>
												) : productSearchValue.trim() ? (
													<p className="mt-2 text-xs font-medium text-slate-500">
														{visibleProductOptions.length === 1
															? "1 referencia encontrada"
															: `${visibleProductOptions.length} referencias encontradas`}
													</p>
												) : null}

												{linePreview ? (
													<div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
														<span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
															Unidad{" "}
															{formatOrderCents(linePreview.unitPriceCents)}
														</span>
														{linePreview.hasDiscount ? (
															<>
																<span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
																	Promo -
																	{formatOrderPercentage(
																		linePreview.discountPercentage,
																	)}
																	%
																</span>
																<span className="rounded-full bg-emerald-50 px-3 py-1 font-semibold text-emerald-700">
																	Ahorro{" "}
																	{formatOrderCents(linePreview.discountCents)}
																</span>
																<span className="rounded-full bg-slate-900 px-3 py-1 font-semibold text-white">
																	Final{" "}
																	{formatOrderCents(linePreview.totalCents)}
																</span>
															</>
														) : (
															<span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700">
																Total{" "}
																{formatOrderCents(linePreview.totalCents)}
															</span>
														)}
														{selectedProductOption?.discountTitle ? (
															<span className="min-w-0 truncate rounded-full bg-sky-50 px-3 py-1 font-semibold text-sky-700">
																{selectedProductOption.discountTitle}
															</span>
														) : null}
													</div>
												) : null}
											</div>

											<div>
												<label
													htmlFor={`order-quantity-${line.localId}`}
													className="mb-2 block text-sm font-medium text-slate-700"
												>
													Cantidad
												</label>
												<input
													id={`order-quantity-${line.localId}`}
													type="number"
													min={1}
													step={1}
													value={line.quantity}
													onChange={(event) =>
														updateLine(line.localId, {
															quantity: Number(event.target.value),
														})
													}
													className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
												/>
											</div>

											<div className="flex items-end">
												<button
													type="button"
													onClick={() => removeLine(line.localId)}
													disabled={lines.length === 1}
													className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
												>
													Quitar
												</button>
											</div>
										</div>
									);
								})}
							</div>

							<div className="flex flex-wrap gap-3">
								<button
									type="button"
									onClick={addLine}
									className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
								>
									{addLineLabel}
								</button>
							</div>

							<div>
								<label
									htmlFor="order-notes"
									className="mb-2 block text-sm font-medium text-slate-700"
								>
									Observaciones
								</label>
								<textarea
									id="order-notes"
									value={notes}
									onChange={(event) => setNotes(event.target.value)}
									rows={4}
									placeholder="Indicaciones de preparación, reparto o contexto comercial"
									className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
								/>
							</div>

							<div className="flex flex-wrap gap-3">
								<button
									type="button"
									onClick={handleSaveDraft}
									disabled={savingDraft || submitting || clearingDraft}
									className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
								>
									{savingDraft ? "Guardando..." : "Guardar borrador"}
								</button>
								<button
									type="button"
									onClick={handleClearDraft}
									disabled={clearingDraft || savingDraft || submitting}
									className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
								>
									{clearingDraft ? "Vaciando..." : "Vaciar borrador"}
								</button>
								<button
									type="submit"
									disabled={
										submitting ||
										savingDraft ||
										clearingDraft ||
										orderLimitReached
									}
									className="inline-flex rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
								>
									{submitting ? "Registrando pedido..." : "Registrar pedido"}
								</button>
							</div>
						</form>
					)}
					</section>
				) : null}

				{showHistory ? (
					<section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
							<div className="space-y-1">
								<p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
									Historial
								</p>
								<h2 className="text-2xl font-semibold text-slate-900">
									Pedidos registrados
								</h2>
								<p className="text-sm text-slate-600">
									Mostrando{" "}
									<span className="font-semibold text-slate-900">
										{visibleOrders.length}
									</span>{" "}
									de{" "}
									<span className="font-semibold text-slate-900">
										{orders.length}
									</span>{" "}
									pedidos
								</p>
							</div>

							<button
								type="button"
								onClick={() =>
									setIsHistoryFiltersOpen((currentValue) => !currentValue)
								}
								className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
							>
								{isHistoryFiltersOpen ? "Ocultar filtros" : "Mostrar filtros"}
							</button>
						</div>

						{isHistoryFiltersOpen ? (
							<div
								className={`mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 ${
									mode === "commercial"
										? "lg:grid-cols-[minmax(0,1.2fr)_180px_180px_190px_190px_220px]"
										: "lg:grid-cols-[minmax(0,1fr)_180px_180px_200px_200px]"
								}`}
							>
								<div>
									<label
										htmlFor="orders-history-search"
										className="mb-2 block text-sm font-medium text-slate-700"
									>
										Buscar
									</label>
									<input
										id="orders-history-search"
										type="text"
										value={historySearch}
										onChange={(event) => setHistorySearch(event.target.value)}
										placeholder="Pedido, cliente, creador o referencia"
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									/>
								</div>

								<div>
									<label
										htmlFor="orders-history-date-from-filter"
										className="mb-2 block text-sm font-medium text-slate-700"
									>
										Desde
									</label>
									<input
										id="orders-history-date-from-filter"
										type="date"
										value={historyDateFromFilter}
										onChange={(event) =>
											setHistoryDateFromFilter(event.target.value)
										}
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									/>
								</div>

								<div>
									<label
										htmlFor="orders-history-date-to-filter"
										className="mb-2 block text-sm font-medium text-slate-700"
									>
										Hasta
									</label>
									<input
										id="orders-history-date-to-filter"
										type="date"
										value={historyDateToFilter}
										onChange={(event) =>
											setHistoryDateToFilter(event.target.value)
										}
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									/>
								</div>

								{mode === "commercial" ? (
									<div>
										<label
											htmlFor="orders-history-client-filter"
											className="mb-2 block text-sm font-medium text-slate-700"
										>
											Cliente
										</label>
										<select
											id="orders-history-client-filter"
											value={historyClientFilter}
											onChange={(event) =>
												setHistoryClientFilter(event.target.value)
											}
											className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
										>
											<option value="all">Todos los clientes</option>
											{clientOptions.map((client) => (
												<option key={client.id} value={client.id}>
													{client.name}
												</option>
											))}
										</select>
									</div>
								) : null}

								<div>
									<label
										htmlFor="orders-history-status-filter"
										className="mb-2 block text-sm font-medium text-slate-700"
									>
										Estado
									</label>
									<select
										id="orders-history-status-filter"
										value={historyStatusFilter}
										onChange={(event) =>
											setHistoryStatusFilter(event.target.value)
										}
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									>
										<option value="all">Todos</option>
										<option value="created">Creado</option>
										<option value="confirmed">Confirmado</option>
										<option value="delivered">Entregado</option>
										<option value="cancelled">Cancelado</option>
									</select>
								</div>

								<div>
									<label
										htmlFor="orders-history-payment-filter"
										className="mb-2 block text-sm font-medium text-slate-700"
									>
										Cobro
									</label>
									<select
										id="orders-history-payment-filter"
										value={historyPaymentFilter}
										onChange={(event) =>
											setHistoryPaymentFilter(event.target.value)
										}
										className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									>
										<option value="all">Todos</option>
										<option value="pending">Pendiente</option>
										<option value="paid">Cobrado</option>
									</select>
								</div>

								{hasHistoryFilters ? (
									<button
										type="button"
										onClick={resetHistoryFilters}
										className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 lg:col-start-1"
									>
										Limpiar filtros
									</button>
								) : null}
							</div>
						) : null}

					{visibleOrders.length === 0 ? (
						<div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-white/70 px-5 py-6 text-sm text-slate-600">
							Aún no hay pedidos registrados en este contexto.
						</div>
					) : (
						<div
							className={
								mode === "commercial"
									? "mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3"
									: "mt-5 space-y-4"
							}
						>
							{visibleOrders.map((order) => (
								<article
									key={order.id}
									className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
								>
									<div
										className={
											mode === "commercial"
												? "flex h-full flex-col gap-4"
												: "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"
										}
									>
										<div className="space-y-2">
											<div className="flex flex-wrap items-center gap-2">
												<span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
													Pedido {order.id.slice(0, 8)}
												</span>
												<span
													className={`rounded-full px-3 py-1 text-xs font-semibold ${getOrderStatusClasses(
														order.status_code,
													)}`}
												>
													{order.status_name}
												</span>
												{order.status_code === "delivered" ? (
													<span
														className={`rounded-full px-3 py-1 text-xs font-semibold ${getOrderPaymentStatusClasses(
															order.payment_status_code,
														)}`}
													>
														{order.payment_status_name}
													</span>
												) : null}
												{mode === "client" &&
												order.created_by_user_role_id === ROLE_IDS.COMMERCIAL ? (
													<span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
														Gestionado por {order.created_by_user_name}
													</span>
												) : null}
												{mode === "commercial" ? (
													<span className="rounded-full bg-fuchsia-100 px-3 py-1 text-xs font-semibold text-fuchsia-700">
														{order.client_name}
													</span>
												) : null}
												<span
													className={`rounded-full px-3 py-1 text-xs font-semibold ${
														order.fulfillment_method === "agency"
															? "bg-amber-100 text-amber-800"
															: "bg-sky-100 text-sky-800"
													}`}
												>
													{order.fulfillment_method === "agency"
														? "Agencia"
														: "Comercial"}
												</span>
											</div>

											<p className="text-sm text-slate-600">
												Registrado el{" "}
												<span className="font-medium text-slate-900">
													{formatDateTime(order.created_at)}
												</span>{" "}
												por{" "}
												<span className="font-medium text-slate-900">
													{order.created_by_user_name}
												</span>
											</p>

											{order.notes ? (
												<p className="text-sm leading-6 text-slate-600">
													{order.notes}
												</p>
											) : null}
										</div>

										<div
											className={
												mode === "commercial"
													? "mt-auto grid gap-3 sm:grid-cols-2"
													: "grid gap-3 sm:grid-cols-2 lg:w-[320px]"
											}
										>
											<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
												<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
													Importe total
												</p>
												<p className="mt-2 text-lg font-semibold text-slate-900">
													{formatCurrency(order.total_amount)}
												</p>
												{getOrderDiscountSummary(order).hasDiscounts ? (
													<p className="mt-1 text-xs font-semibold text-emerald-700">
														Promo -{" "}
														{formatOrderCents(
															getOrderDiscountSummary(order)
																.totalDiscountCents,
														)}
													</p>
												) : null}
												{order.fulfillment_method === "agency" ? (
													<p className="mt-1 text-xs font-semibold text-amber-700">
														Agencia +{" "}
														{formatCurrency(order.agency_delivery_fee)}
													</p>
												) : null}
											</div>
											<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
												<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
													Bultos
												</p>
												<p className="mt-2 text-lg font-semibold text-slate-900">
													{getOrderPackageCount(order)}
												</p>
											</div>
											<Link
												href={`${detailBasePath}/${order.id}`}
												className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:col-span-2"
											>
												Ver detalle del pedido
											</Link>
										</div>
									</div>

									<div
										className={
											mode === "commercial"
												? "hidden"
												: "mt-4 grid gap-3 lg:grid-cols-2"
										}
									>
										{order.lines.map((line) => (
											<div
												key={line.id}
												className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
											>
												<div className="flex flex-wrap items-center gap-2">
													<span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
														{line.order_reference}
													</span>
													{line.color_reference_code ? (
														<span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
															Tono {line.color_reference_code}
														</span>
													) : null}
												</div>
												<p className="mt-2 text-sm font-semibold text-slate-900">
													{line.product_name}
												</p>
												{line.color_reference_name ? (
													<p className="mt-1 text-sm text-slate-600">
														{line.color_reference_name}
													</p>
												) : null}
												<p className="mt-1 text-sm text-slate-600">
													Cantidad: {line.quantity}
													{line.product_line_name
														? ` · ${line.product_line_name}`
														: ""}
												</p>
											</div>
										))}
									</div>
								</article>
							))}
						</div>
					)}
					</section>
				) : null}
			</div>
		</PageTransition>
	);
}
