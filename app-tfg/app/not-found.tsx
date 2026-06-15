import Link from "next/link";
import { requireUserSession } from "@/lib/auth/require-session";

export default async function NotFoundPage() {
	const session = await requireUserSession();
	const role = session.user?.role;

	return (
		<div className="flex min-h-screen items-center justify-center px-4">
			<div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-md">
				<div className="mb-4">
					<p className="text-6xl font-bold text-slate-900">404</p>
					<p className="mt-2 text-sm text-slate-500">Página no encontrada</p>
				</div>

				<p className="text-sm text-slate-600">
					La página que estás buscando no existe, ha sido movida o no tienes
					acceso.
				</p>

				<div className="mt-6 flex flex-col gap-3">
					<Link
						href={role === "admin" ? "/admin" : "/"}
						className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
					>
						Ir al inicio
					</Link>

					<Link
						href="/contact"
						className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
					>
						Contactar con soporte
					</Link>
				</div>
			</div>
		</div>
	);
}
