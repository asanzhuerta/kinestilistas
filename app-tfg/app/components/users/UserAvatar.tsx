"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

// Componente cliente que muestra el avatar de un usuario a partir de su nombre e imagen.
type UserAvatarProps = {
	name?: string | null;
	imageUrl?: string | null;
	size?: "sm" | "md" | "lg" | "xl";
	shape?: "circle" | "soft-square";
	imageFit?: "cover" | "contain";
	imagePaddingClass?: string;
	imagePositionClass?: string;
	imageBackgroundClass?: string;
	className?: string;
};

// Extrae la inicial del nombre para mostrarla si no hay imagen disponible.
function getUserInitial(name: string | null | undefined) {
	const normalizedName = String(name ?? "").trim();
	return normalizedName ? normalizedName.charAt(0).toUpperCase() : "?";
}

// Define las clases de tamaño para el avatar según la prop "size".
const sizeClasses = {
	sm: {
		container: "h-10 w-10 text-sm",
		pixels: 40,
	},
	md: {
		container: "h-12 w-12 text-base",
		pixels: 48,
	},
	lg: {
		container: "h-16 w-16 text-xl",
		pixels: 64,
	},
	xl: {
		container: "h-24 w-24 text-3xl",
		pixels: 96,
	},
};

// El componente principal que renderiza el avatar.
// En lugar de pintar directamente la imagen y esperar al error,
// primero se comprueba en cliente si la URL carga correctamente.
// Si no hay imagen o falla la comprobación, se muestra la inicial.
export default function UserAvatar({
	name,
	imageUrl,
	size = "md",
	shape = "circle",
	imageFit = "cover",
	imagePaddingClass = "p-2",
	imagePositionClass = "object-center",
	imageBackgroundClass = "bg-white",
	className = "",
}: UserAvatarProps) {
	const userInitial = getUserInitial(name);

	// Estado que indica si la imagen actual ha sido validada correctamente.
	const [imageCheck, setImageCheck] = useState<{
		checkedUrl: string | null;
		isValid: boolean;
	}>({
		checkedUrl: null,
		isValid: false,
	});

	// Cada vez que cambia la URL, se comprueba en cliente si la imagen existe
	// y puede cargarse correctamente antes de renderizarla.
	useEffect(() => {
		if (!imageUrl) {
			return;
		}

		const testImage = new window.Image();

		testImage.onload = () => {
			setImageCheck({
				checkedUrl: imageUrl,
				isValid: true,
			});
		};

		testImage.onerror = () => {
			setImageCheck({
				checkedUrl: imageUrl,
				isValid: false,
			});
		};

		testImage.src = imageUrl;

		return () => {
			testImage.onload = null;
			testImage.onerror = null;
		};
	}, [imageUrl]);

	// Solo se muestra la imagen si existe una URL y la comprobación previa fue correcta.
	const shouldShowImage =
		Boolean(imageUrl) &&
		imageCheck.checkedUrl === imageUrl &&
		imageCheck.isValid;
	const avatarSize = sizeClasses[size];
	const shapeClass = shape === "soft-square" ? "rounded-2xl" : "rounded-full";
	const containerBackgroundClass = shouldShowImage
		? imageBackgroundClass
		: "bg-slate-200";
	const imageClassName =
		imageFit === "contain"
			? `h-full w-full object-contain ${imagePositionClass} ${imagePaddingClass}`
			: `h-full w-full object-cover ${imagePositionClass}`;

	return (
		<div
			className={`relative flex items-center justify-center overflow-hidden font-semibold text-slate-600 ${containerBackgroundClass} ${shapeClass} ${avatarSize.container} ${className}`}
		>
			{shouldShowImage ? (
				<Image
					src={imageUrl ?? ""}
					alt="Foto de perfil"
					width={avatarSize.pixels}
					height={avatarSize.pixels}
					className={imageClassName}
					unoptimized={false}
				/>
			) : (
				<span>{userInitial}</span>
			)}
		</div>
	);
}
