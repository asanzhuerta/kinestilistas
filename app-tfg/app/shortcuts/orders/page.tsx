import { redirectToRoleShortcut } from "../roleAwareShortcut";

export default async function OrdersShortcutPage() {
	await redirectToRoleShortcut({
		admin: "/admin/orders",
		commercial: "/commercials/orders",
		client: "/clients/orders",
	});
}
