import { auth } from "@/auth";
import PublicLandingPage from "@/app/components/landing/PublicLandingPage";
import { redirect } from "next/navigation";

export default async function Home() {
	const session = await auth();
	const role = session?.user?.role;

	if (role === "admin") {
		redirect("/admin");
	}

	if (role === "commercial") {
		redirect("/commercials");
	}

	if (role === "client") {
		redirect("/clients");
	}

	return <PublicLandingPage />;
}
