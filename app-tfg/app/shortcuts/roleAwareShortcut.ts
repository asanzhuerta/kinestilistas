import { auth } from "@/auth";
import { redirect } from "next/navigation";

type ShortcutTargets = {
	admin: string;
	commercial: string;
	client: string;
};

export async function redirectToRoleShortcut(targets: ShortcutTargets) {
	const session = await auth();
	const role = session?.user?.role;

	if (role === "admin") {
		redirect(targets.admin);
	}

	if (role === "commercial") {
		redirect(targets.commercial);
	}

	if (role === "client") {
		redirect(targets.client);
	}

	redirect("/login");
}
