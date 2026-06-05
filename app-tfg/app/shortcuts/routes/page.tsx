import { redirectToRoleShortcut } from "../roleAwareShortcut";

export default async function RoutesShortcutPage() {
	await redirectToRoleShortcut({
		admin: "/admin/operations",
		commercial: "/commercials/routes",
		client: "/clients",
	});
}
