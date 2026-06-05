import { redirectToRoleShortcut } from "../roleAwareShortcut";

export default async function PanelShortcutPage() {
	await redirectToRoleShortcut({
		admin: "/admin",
		commercial: "/commercials",
		client: "/clients",
	});
}
