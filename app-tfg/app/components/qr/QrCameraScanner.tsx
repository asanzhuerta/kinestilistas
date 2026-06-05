"use client";

import { useRef, useState } from "react";

type DetectionResponse = {
	accepted: boolean;
	message: string;
	stop?: boolean;
};

type Props = {
	isOpen: boolean;
	onClose: () => void;
	onDetected: (rawValue: string) => DetectionResponse;
};

type BarcodeDetectionResultLike = {
	rawValue?: string;
};

type BarcodeDetectorLike = {
	detect: (
		source: CanvasImageSource | HTMLCanvasElement | ImageBitmap,
	) => Promise<BarcodeDetectionResultLike[]>;
};

type BarcodeDetectorConstructorLike = {
	new (options?: { formats?: string[] }): BarcodeDetectorLike;
};

function getBarcodeDetectorConstructor() {
	if (typeof window === "undefined") {
		return null;
	}

	return (
		window as typeof window & {
			BarcodeDetector?: BarcodeDetectorConstructorLike;
		}
	).BarcodeDetector ?? null;
}

export default function QrCameraScanner({
	isOpen,
	onClose,
	onDetected,
}: Props) {
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	const [statusMessage, setStatusMessage] = useState("");
	const [isProcessingImage, setIsProcessingImage] = useState(false);
	const isSupported = Boolean(getBarcodeDetectorConstructor());

	function handleClose() {
		setStatusMessage("");
		onClose();
	}

	async function detectFromImageFile(file: File) {
		const BarcodeDetectorConstructor = getBarcodeDetectorConstructor();

		if (!BarcodeDetectorConstructor) {
			setStatusMessage(
				"Este navegador permite abrir la camara, pero no descodificar el QR desde la imagen capturada. Usa el modo manual o un navegador compatible.",
			);
			return;
		}

		setIsProcessingImage(true);

		try {
			const detector = new BarcodeDetectorConstructor({
				formats: ["qr_code"],
			});
			const bitmap = await createImageBitmap(file);

			try {
				const detections = await detector.detect(bitmap);
				const detectedValue = detections.find((result) => result.rawValue)?.rawValue;

				if (!detectedValue) {
					setStatusMessage(
						"No se detecto ningun QR en la imagen. Prueba con mas luz o acercando mejor el codigo.",
					);
					return;
				}

				const response = onDetected(detectedValue);
				setStatusMessage(response.message);

				if (response.stop) {
					handleClose();
				}
			} finally {
				bitmap.close();
			}
		} catch (error) {
			setStatusMessage(
				error instanceof Error
					? error.message
					: "No se pudo analizar la imagen capturada.",
			);
		} finally {
			setIsProcessingImage(false);

			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	}

	if (!isOpen) {
		return null;
	}

	return (
		<div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/72 px-4 py-6 backdrop-blur-sm">
			<div className="w-full max-w-md rounded-[28px] border border-white/15 bg-slate-950 text-white shadow-2xl">
				<input
					ref={fileInputRef}
					type="file"
					aria-label="Capturar o seleccionar imagen con QR"
					accept="image/*"
					capture="environment"
					onChange={(event) => {
						const file = event.target.files?.[0];

						if (!file) {
							return;
						}

						void detectFromImageFile(file);
					}}
					className="hidden"
				/>

				<div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5">
					<div>
						<h2 className="text-lg font-semibold">Escanear QR del paquete</h2>
						<p className="mt-1 text-sm text-slate-300">
							Se abrira la camara nativa del movil para capturar el QR del
							paquete.
						</p>
					</div>

					<button
						type="button"
						onClick={handleClose}
						className="rounded-2xl border border-white/15 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
					>
						Cerrar
					</button>
				</div>

				<div className="space-y-5 px-5 py-5">
					<div className="rounded-[24px] border border-white/10 bg-white/[0.03] px-5 py-6 text-center">
						<div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[24px] border-2 border-dashed border-white/25">
							<div className="h-12 w-12 rounded-xl border border-white/20" />
						</div>
						<p className="mt-4 text-sm leading-6 text-slate-300">
							Encuadra el QR con buena luz. Cuando vuelvas a la app, intentaremos
							leerlo automaticamente.
						</p>
						{!isSupported ? (
							<p className="mt-3 text-sm text-amber-300">
								Si tu navegador no permite leer el QR al volver, sigue
								disponible la opcion de pegar el codigo manualmente.
							</p>
						) : null}
					</div>

					<button
						type="button"
						onClick={() => fileInputRef.current?.click()}
						disabled={isProcessingImage}
						className="flex w-full items-center justify-center rounded-2xl bg-white px-4 py-3.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isProcessingImage
							? "Analizando captura..."
							: "Abrir cámara del móvil"}
					</button>
				</div>

				{statusMessage ? (
					<div className="mx-5 mb-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
						{statusMessage}
					</div>
				) : null}
			</div>
		</div>
	);
}
