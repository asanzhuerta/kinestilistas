import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	reactStrictMode: true,

	// Para evitar errores con túneles tipo Cloudflare / DevTunnels
	// al hacer fetch desde el cliente a la API
	allowedDevOrigins: ["*.trycloudflare.com", "*.devtunnels.ms"],

	// Evitar que Next bundlee dependencias sensibles de servidor
	// que usan metadata/reflexión o APIs nativas de Node.
	serverExternalPackages: ["typeorm", "pg", "reflect-metadata"],

	// TypeORM puede romper en producción si las clases del servidor
	// se minifican y pierden su nombre estable.
	experimental: {
		serverMinification: false,
	},

	// Permite cargar imágenes remotas desde Cloudinary con next/image
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "res.cloudinary.com",
			},
			{
				protocol: "https",
				hostname: "kinmobileapp.com",
				pathname: "/kincolor/img/**",
			},
		],
	},
};

export default nextConfig;
