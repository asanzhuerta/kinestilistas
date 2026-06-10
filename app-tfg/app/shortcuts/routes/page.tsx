import { redirectToRoleShortcut } from "../roleAwareShortcut";

export default async function RoutesShortcutPage() {
	await redirectToRoleShortcut({
		admin: "/admin",
		commercial: "/commercials/routes",
		client: "/clients",
	});
}
