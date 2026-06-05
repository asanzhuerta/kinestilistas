import { redirectToRoleShortcut } from "../roleAwareShortcut";

export default async function CatalogShortcutPage() {
	await redirectToRoleShortcut({
		admin: "/admin/catalog",
		commercial: "/commercials/catalog",
		client: "/clients/catalog",
	});
}
