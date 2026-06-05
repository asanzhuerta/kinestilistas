import Link from "next/link";
import HeaderTitle from "@/app/components/basics/HeaderTitle";

export default function OfflinePage() {
	return (
		<main className="app-bg flex min-h-screen items-center justify-center px-5 py-8 text-slate-950">
			<section className="w-full max-w-xl rounded-[2rem] border border-white/65 bg-white/82 p-7 text-center shadow-2xl shadow-slate-950/15 backdrop-blur-xl">
				<HeaderTitle title="Kinestilistas" />

				<p className="text-xs font-black uppercase tracking-[0.24em] text-slate-500">
					Sin conexión
				</p>
				<h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-slate-950">
					No podemos cargar esta pantalla ahora mismo.
				</h1>
				<p className="mt-4 text-sm leading-7 text-slate-600">
					La aplicación conserva un acceso básico instalado, pero los datos de
					pedidos, rutas, perfiles y administración necesitan conexión para
					evitar trabajar con información privada desactualizada.
				</p>

				<div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
					<Link
						href="/"
						className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-white shadow-xl shadow-slate-950/15 transition hover:bg-slate-800"
					>
						Volver al inicio
					</Link>
					<Link
						href="/login"
						className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white/80 px-6 py-3 text-sm font-black uppercase tracking-[0.12em] text-slate-950 transition hover:bg-white"
					>
						Ir al login
					</Link>
				</div>
			</section>
		</main>
	);
}
