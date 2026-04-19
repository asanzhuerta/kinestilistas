"use client";

import L from "leaflet";

// --------------------------------------------------------------------------
// FIX DE ICONOS POR DEFECTO DE LEAFLET
// --------------------------------------------------------------------------
// En entornos bundlados con Next.js, Leaflet puede no resolver bien las rutas
// de los iconos por defecto. Este helper fuerza una configuración estable.
let isConfigured = false;

export function ensureLeafletDefaultIcon() {
	if (isConfigured) return;

	delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
		._getIconUrl;

	L.Icon.Default.mergeOptions({
		iconRetinaUrl:
			"https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
		iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
		shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
	});

	isConfigured = true;
}