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
