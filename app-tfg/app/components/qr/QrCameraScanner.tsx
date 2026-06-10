"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type DetectionResponse = {
	accepted: boolean;
	message: string;
	stop?: boolean;
};

type Props = {
	isOpen: boolean;
	onClose: () => void;
	onDetected: (rawValue: string) => DetectionResponse | Promise<DetectionResponse>;
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

type CameraState =
	| "idle"
	| "starting"
	| "scanning"
	| "validating"
	| "unsupported"
	| "error";

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

function getCameraErrorMessage(error: unknown) {
	if (
		typeof window !== "undefined" &&
		!window.isSecureContext &&
		window.location.hostname !== "localhost"
	) {
		return "La camara en directo necesita HTTPS o localhost para funcionar.";
	}

	if (error instanceof DOMException) {
		if (error.name === "NotAllowedError") {
			return "No se pudo acceder a la camara. Revisa el permiso del navegador.";
		}

		if (error.name === "NotFoundError") {
			return "No se encontro una camara disponible en este dispositivo.";
		}
	}

	return error instanceof Error
		? error.message
		: "No se pudo iniciar la camara.";
}

export default function QrCameraScanner({
	isOpen,
	onClose,
	onDetected,
}: Props) {
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const animationFrameRef = useRef<number | null>(null);
	const processingDetectionRef = useRef(false);
	const lastScanAtRef = useRef(0);
	const lastRejectedScanRef = useRef<{ value: string; at: number } | null>(
		null,
	);
	const onDetectedRef = useRef(onDetected);
	const onCloseRef = useRef(onClose);

	const [isMounted, setIsMounted] = useState(false);
	const [isSupported, setIsSupported] = useState(false);
	const [cameraState, setCameraState] = useState<CameraState>("idle");
	const [statusMessage, setStatusMessage] = useState("");

	useEffect(() => {
		onDetectedRef.current = onDetected;
	}, [onDetected]);

	useEffect(() => {
		onCloseRef.current = onClose;
	}, [onClose]);

	useEffect(() => {
		setIsMounted(true);
		setIsSupported(
			!!getBarcodeDetectorConstructor() &&
				!!navigator.mediaDevices?.getUserMedia,
		);

		return () => {
			setIsMounted(false);
		};
	}, []);

	useEffect(() => {
		if (!isOpen || typeof document === "undefined") {
			return;
		}

		const previousOverflow = document.body.style.overflow;
		document.body.style.overflow = "hidden";

		return () => {
			document.body.style.overflow = previousOverflow;
		};
	}, [isOpen]);

	useEffect(() => {
		function stopCamera() {
			if (animationFrameRef.current !== null) {
				window.cancelAnimationFrame(animationFrameRef.current);
				animationFrameRef.current = null;
			}

			streamRef.current?.getTracks().forEach((track) => track.stop());
			streamRef.current = null;
			processingDetectionRef.current = false;
			lastScanAtRef.current = 0;
			lastRejectedScanRef.current = null;

			if (videoRef.current) {
				videoRef.current.pause();
				videoRef.current.srcObject = null;
			}
		}

		if (!isOpen) {
			stopCamera();
			setCameraState("idle");
			setStatusMessage("");
			return;
		}

		let cancelled = false;

		async function startScanner() {
			const BarcodeDetectorConstructor = getBarcodeDetectorConstructor();

			if (!BarcodeDetectorConstructor || !navigator.mediaDevices?.getUserMedia) {
				setCameraState("unsupported");
				setStatusMessage(
					"Este navegador no permite leer QR en directo. Usa el modo manual para pegar el codigo.",
				);
				return;
			}

			try {
				setCameraState("starting");
				setStatusMessage("Abriendo camara...");

				const stream = await navigator.mediaDevices.getUserMedia({
					audio: false,
					video: {
						facingMode: { ideal: "environment" },
						height: { ideal: 1080 },
						width: { ideal: 1920 },
					},
				});

				if (cancelled) {
					stream.getTracks().forEach((track) => track.stop());
					return;
				}

				streamRef.current = stream;

				const video = videoRef.current;
				if (!video) {
					return;
				}

				video.srcObject = stream;
				await video.play();

				if (cancelled) {
					return;
				}

				const detector = new BarcodeDetectorConstructor({
					formats: ["qr_code"],
				});

				setCameraState("scanning");
				setStatusMessage("Buscando QR. Mantenlo dentro del recuadro.");

				const scanFrame = async (timestamp: number) => {
					if (cancelled) {
						return;
					}

					const activeVideo = videoRef.current;
					const canvas = canvasRef.current;

					if (
						activeVideo &&
						canvas &&
						activeVideo.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
						!processingDetectionRef.current &&
						timestamp - lastScanAtRef.current >= 220
					) {
						lastScanAtRef.current = timestamp;
						processingDetectionRef.current = true;

						try {
							const videoWidth = activeVideo.videoWidth;
							const videoHeight = activeVideo.videoHeight;

							if (videoWidth > 0 && videoHeight > 0) {
								const largestSide = Math.max(videoWidth, videoHeight);
								const scale = Math.min(1, 960 / largestSide);
								canvas.width = Math.max(1, Math.round(videoWidth * scale));
								canvas.height = Math.max(1, Math.round(videoHeight * scale));

								const context = canvas.getContext("2d", {
									willReadFrequently: true,
								});

								if (context) {
									context.drawImage(activeVideo, 0, 0, canvas.width, canvas.height);
									const detections = await detector.detect(canvas);
									const detectedValue = detections.find(
										(result) => result.rawValue,
									)?.rawValue;

									if (detectedValue) {
										const now = Date.now();
										const lastRejectedScan = lastRejectedScanRef.current;

										if (
											lastRejectedScan?.value !== detectedValue ||
											now - lastRejectedScan.at > 1800
										) {
											setCameraState("validating");
											setStatusMessage("QR detectado. Validando pedido...");

											const response = await onDetectedRef.current(detectedValue);
											setStatusMessage(response.message);

											if (response.stop) {
												onCloseRef.current();
												return;
											}

											if (!response.accepted) {
												lastRejectedScanRef.current = {
													value: detectedValue,
													at: now,
												};
											}

											setCameraState("scanning");
										}
									}
								}
							}
						} catch {
							if (!cancelled) {
								setStatusMessage(
									"No se pudo leer este fotograma. Ajusta el enfoque o la luz.",
								);
							}
						} finally {
							processingDetectionRef.current = false;
						}
					}

					animationFrameRef.current = window.requestAnimationFrame(scanFrame);
				};

				animationFrameRef.current = window.requestAnimationFrame(scanFrame);
			} catch (error) {
				if (!cancelled) {
					setCameraState("error");
					setStatusMessage(getCameraErrorMessage(error));
				}
			}
		}

		void startScanner();

		return () => {
			cancelled = true;
			stopCamera();
		};
	}, [isOpen]);

	if (!isOpen || !isMounted) {
		return null;
	}

	const isStarting = cameraState === "starting";
	const isValidating = cameraState === "validating";
	const showCameraUnavailable =
		cameraState === "unsupported" || cameraState === "error";

	return createPortal(
		<div className="fixed inset-0 z-[140] flex items-center justify-center overflow-y-auto bg-slate-950/85 px-4 py-4 text-white backdrop-blur-sm">
			<div className="flex max-h-[calc(100svh-2rem)] w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-white/15 bg-slate-950 shadow-2xl">
				<div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
					<div className="min-w-0">
						<h2 className="text-lg font-semibold">Escanear QR del paquete</h2>
						<p className="mt-1 text-sm text-slate-300">
							Apunta al codigo. La camara se cerrara cuando el pedido quede
							validado.
						</p>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="shrink-0 rounded-2xl border border-white/15 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
					>
						Cerrar
					</button>
				</div>

				<div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
					<div className="relative mx-auto aspect-[3/4] max-h-[54svh] w-full overflow-hidden rounded-[24px] border border-white/10 bg-black">
						<video
							ref={videoRef}
							autoPlay
							muted
							playsInline
							className={`h-full w-full object-cover ${
								showCameraUnavailable ? "opacity-20" : "opacity-100"
							}`}
						/>
						<canvas ref={canvasRef} className="hidden" />

						<div className="pointer-events-none absolute inset-0 grid place-items-center bg-[radial-gradient(circle_at_center,transparent_0,transparent_42%,rgba(2,6,23,0.55)_43%,rgba(2,6,23,0.72)_100%)]">
							<div className="relative h-[64%] w-[78%] max-w-72 rounded-[24px] border border-white/40">
								<span className="absolute -left-px -top-px h-12 w-12 rounded-tl-[24px] border-l-4 border-t-4 border-emerald-300" />
								<span className="absolute -right-px -top-px h-12 w-12 rounded-tr-[24px] border-r-4 border-t-4 border-emerald-300" />
								<span className="absolute -bottom-px -left-px h-12 w-12 rounded-bl-[24px] border-b-4 border-l-4 border-emerald-300" />
								<span className="absolute -bottom-px -right-px h-12 w-12 rounded-br-[24px] border-b-4 border-r-4 border-emerald-300" />
							</div>
						</div>

						{isStarting || isValidating || showCameraUnavailable ? (
							<div className="absolute inset-x-4 top-4 rounded-2xl border border-white/10 bg-slate-950/85 px-4 py-3 text-center text-sm font-medium text-slate-100 shadow-lg">
								{isStarting
									? "Abriendo camara..."
									: isValidating
										? "Validando QR..."
										: "Camara no disponible"}
							</div>
						) : null}
					</div>

					<div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm leading-6 text-slate-200">
						{statusMessage ||
							(isSupported
								? "Buscando QR. Manten el telefono estable y evita reflejos."
								: "Este navegador no permite leer QR en directo.")}
					</div>
				</div>
			</div>
		</div>,
		document.body,
	);
}
