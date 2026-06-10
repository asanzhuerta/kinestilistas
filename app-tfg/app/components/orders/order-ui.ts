import type {
	OrderProductOption,
	OrderSummary,
	OrderSummaryLine,
} from "@/lib/contracts/order";

export function formatOrderCurrency(amount: string) {
	const parsed = Number(amount);

	if (!Number.isFinite(parsed)) {
		return amount;
	}

	return parsed.toLocaleString("es-ES", {
		style: "currency",
		currency: "EUR",
	});
}

export function formatOrderCents(cents: number) {
	return formatOrderCurrency((cents / 100).toFixed(2));
}

export function formatOrderPercentage(value: string | number) {
	const parsed = Number(value);

	if (!Number.isFinite(parsed)) {
		return String(value);
	}

	return parsed.toLocaleString("es-ES", {
		maximumFractionDigits: 2,
		minimumFractionDigits: parsed % 1 === 0 ? 0 : 2,
	});
}

export function getOrderLineSubtotalCents(line: OrderSummaryLine) {
	const unitPrice = Number(line.unit_price_snapshot);

	if (!Number.isFinite(unitPrice) || unitPrice < 0) {
		return 0;
	}

	return Math.round(unitPrice * 100) * line.quantity;
}

export function getOrderLineTotalCents(line: OrderSummaryLine) {
	const lineTotal = Number(line.line_total);

	if (!Number.isFinite(lineTotal) || lineTotal < 0) {
		return 0;
	}

	return Math.round(lineTotal * 100);
}

export function getOrderLineDiscountCents(line: OrderSummaryLine) {
	return Math.max(
		0,
		getOrderLineSubtotalCents(line) - getOrderLineTotalCents(line),
	);
}

export function hasOrderLineDiscount(line: OrderSummaryLine) {
	return Number(line.discount_percentage) > 0 && getOrderLineDiscountCents(line) > 0;
}

export function buildOrderLinePromotionLabel(line: OrderSummaryLine) {
	const targetName = line.product_line_name || line.product_name;

	return `Promoción aplicada: ${formatOrderPercentage(
		line.discount_percentage,
	)} % en ${targetName}`;
}

export function getOrderDiscountSummary(order: OrderSummary | null | undefined) {
	const discountedLines = order?.lines.filter(hasOrderLineDiscount) ?? [];
	const totalDiscountCents = discountedLines.reduce(
		(total, line) => total + getOrderLineDiscountCents(line),
		0,
	);

	return {
		discountedLineCount: discountedLines.length,
		totalDiscountCents,
		hasDiscounts: discountedLines.length > 0 && totalDiscountCents > 0,
	};
}

export function getOrderPackageCount(order: OrderSummary | null | undefined) {
	const packageCount =
		order?.lines.reduce((total, line) => total + Math.max(0, line.quantity), 0) ??
		0;

	return packageCount > 0 ? packageCount : order?.line_count ?? 0;
}

export function getOrderStatusClasses(statusCode: string) {
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

export function getOrderPaymentStatusClasses(statusCode: string) {
	switch (statusCode) {
		case "paid":
			return "bg-emerald-100 text-emerald-700";
		case "pending":
			return "bg-amber-100 text-amber-700";
		default:
			return "bg-slate-100 text-slate-700";
	}
}

export function getOrderStatusClassesById(statusId: number) {
	switch (statusId) {
		case 1:
			return getOrderStatusClasses("created");
		case 2:
			return getOrderStatusClasses("confirmed");
		case 3:
			return getOrderStatusClasses("delivered");
		case 4:
			return getOrderStatusClasses("cancelled");
		case 5:
			return getOrderStatusClasses("draft");
		default:
			return getOrderStatusClasses("");
	}
}

export function getOrderPaymentMethodLabel(paymentMethod: string | null) {
	switch (paymentMethod) {
		case "cash":
			return "Efectivo";
		case "card":
			return "Tarjeta";
		case "transfer":
			return "Transferencia";
		case "other":
			return "Otro";
		default:
			return "Sin definir";
	}
}

export function buildOrderProductLabel(product: OrderProductOption) {
	const contextParts = [
		product.productLineName,
		product.colorReferenceCode && product.colorReferenceCode !== product.orderReference
			? `tono ${product.colorReferenceCode}`
			: null,
		product.colorReferenceName,
	].filter(Boolean);

	return `${product.orderReference} - ${product.name}${
		contextParts.length > 0 ? ` - ${contextParts.join(" / ")}` : ""
	}`;
}
