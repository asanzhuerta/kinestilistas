import type { OrderProductOption } from "@/lib/contracts/order";

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
