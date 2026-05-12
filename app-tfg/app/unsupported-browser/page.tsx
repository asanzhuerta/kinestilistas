import type { Metadata } from "next";
import HeaderTitle from "@/app/components/basics/HeaderTitle";

export const metadata: Metadata = {
	title: "Navegador no compatible | KinEstilistas",
	description:
		"Tu navegador es demasiado antiguo para ejecutar KinEstilistas correctamente.",
};

// unsupported-browser/page
// Página informativa mostrada cuando el proxy detecta un navegador
// por debajo del soporte mínimo definido para la aplicación.
//
// Se mantiene el mismo lenguaje visual de la app:
// - fondo app-bg
// - encabezado HeaderTitle
// - tarjeta principal tipo glass-card
// - composición centrada y limpia
export default function UnsupportedBrowserPage() {
	return (
		<main className="app-bg min-h-[100svh] w-full px-4 py-4 text-slate-800">
			<div className="mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col">
				<HeaderTitle
					title="KinEstilistas"
					subtitle="Alta Peluquería &amp; Estética"
				/>

				<section className="mx-auto mt-4 flex w-full max-w-4xl flex-1 items-center">
					<div className="glass-card w-full overflow-hidden rounded-[28px] border border-white/30 shadow-xl">
						{/* CABECERA DE LA TARJETA */}
						<div className="glass-header px-6 py-5 sm:px-8">
							<p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-700/80">
								Compatibilidad del sistema
							</p>

							<h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
								Navegador no compatible
							</h1>

							<p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700 sm:text-base">
								Hemos detectado que este navegador es demasiado antiguo para
								ejecutar correctamente la aplicación.
							</p>
						</div>

						{/* CUERPO PRINCIPAL */}
						<div className="grid gap-6 px-6 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.15fr_0.85fr]">
							{/* BLOQUE INFORMATIVO */}
							<div className="space-y-5">
								<div className="rounded-2xl border border-white/35 bg-white/60 p-5 shadow-sm backdrop-blur-sm">
									<h2 className="text-base font-semibold text-slate-900 sm:text-lg">
										¿Por qué aparece esta pantalla?
									</h2>

									<p className="mt-4 text-sm leading-7 text-slate-700 sm:text-[15px]">
										KinEstilistas utiliza funcionalidades modernas del navegador
										para ofrecer una experiencia estable en móvil, tablet y
										escritorio. En versiones antiguas de Safari o iPadOS algunas
										partes pueden fallar, mostrarse mal o no responder como
										deberían.
									</p>
								</div>

								<div className="rounded-2xl border border-white/35 bg-white/60 p-5 shadow-sm backdrop-blur-sm">
									<h2 className="text-base font-semibold text-slate-900 sm:text-lg">
										Qué puedes hacer
									</h2>

									<div className="mt-4 space-y-3 text-sm leading-6 text-slate-700 sm:text-[15px]">
										<div className="rounded-xl border border-slate-200/70 bg-white/70 px-4 py-4">
											<p className="font-medium text-slate-900">
												1. Actualiza tu navegador
											</p>
											<p className="mt-2">
												Instala una versión más reciente para mejorar la
												compatibilidad con la aplicación.
											</p>
										</div>

										<div className="rounded-xl border border-slate-200/70 bg-white/70 px-4 py-4">
											<p className="font-medium text-slate-900">
												2. Actualiza iOS o iPadOS
											</p>
											<p className="mt-2">
												En iPhone y iPad antiguos, el problema suele venir de la
												versión del sistema, no solo de Safari.
											</p>
										</div>

										<div className="rounded-xl border border-slate-200/70 bg-white/70 px-4 py-4">
											<p className="font-medium text-slate-900">
												3. Accede desde otro dispositivo
											</p>
											<p className="mt-2">
												Si lo necesitas de inmediato, entra desde un navegador
												más moderno en otro móvil, tablet o PC.
											</p>
										</div>
									</div>
								</div>
							</div>

							{/* BLOQUE LATERAL */}
							<div className="space-y-5">
								<div className="rounded-2xl border border-slate-200/70 bg-white/75 p-5 text-slate-800 shadow-sm backdrop-blur-sm">
									<p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
										Versiones recomendadas
									</p>

									<ul className="mt-4 space-y-3 text-sm">
										<li className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
											<span className="font-medium text-slate-700">Safari</span>
											<span className="font-semibold text-slate-900">
												16.4+
											</span>
										</li>

										<li className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
											<span className="font-medium text-slate-700">Chrome</span>
											<span className="font-semibold text-slate-900">111+</span>
										</li>

										<li className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
											<span className="font-medium text-slate-700">Edge</span>
											<span className="font-semibold text-slate-900">111+</span>
										</li>

										<li className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
											<span className="font-medium text-slate-700">
												Firefox
											</span>
											<span className="font-semibold text-slate-900">111+</span>
										</li>
									</ul>
								</div>

								<div className="rounded-2xl border border-amber-300/50 bg-amber-50/90 p-5 text-sm text-amber-950 shadow-sm">
									<p className="font-semibold">Aviso</p>
									<p className="mt-3 leading-7">
										En iPad o iPhone muy antiguos puede que sea necesario
										actualizar el sistema operativo para poder usar una versión
										compatible del navegador.
									</p>
								</div>
							</div>
						</div>
					</div>
				</section>
			</div>
		</main>
	);
}
