"use client";

import { useEffect, useMemo, useState } from "react";
import L from "leaflet";
import {
	MapContainer,
	Marker,
	Popup,
	TileLayer,
	useMap,
	useMapEvents,
} from "react-leaflet";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })
	._getIconUrl;

L.Icon.Default.mergeOptions({
	iconRetinaUrl: "/leaflet/marker-icon-2x.png",
	iconUrl: "/leaflet/marker-icon.png",
	shadowUrl: "/leaflet/marker-shadow.png",
});

type Props = {
	clientId: string;
	initialLat?: number | null;
	initialLng?: number | null;
	initialSearchQuery?: string;
	onLocationSaved?: (lat: number, lng: number) => void;
};

type LatLng = {
	lat: number;
	lng: number;
};

const DEFAULT_CENTER: LatLng = {
	lat: 36.5270612,
	lng: -6.2885962,
};

function ClickHandler({ onPick }: { onPick: (latlng: LatLng) => void }) {
	useMapEvents({
		click(event) {
			onPick({
				lat: event.latlng.lat,
				lng: event.latlng.lng,
			});
		},
	});

	return null;
}

function RecenterMap({ position }: { position: LatLng }) {
	const map = useMap();

	useEffect(() => {
		map.setView([position.lat, position.lng], Math.max(map.getZoom(), 16));
	}, [map, position.lat, position.lng]);

	return null;
}

export default function ClientLocationPickerMap({
	clientId,
	initialLat,
	initialLng,
	initialSearchQuery = "",
	onLocationSaved,
}: Props) {
	const initialPosition = useMemo<LatLng>(
		() =>
			initialLat != null && initialLng != null
				? { lat: initialLat, lng: initialLng }
				: DEFAULT_CENTER,
		[initialLat, initialLng],
	);

	const [position, setPosition] = useState<LatLng>(initialPosition);
	const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
	const [searching, setSearching] = useState(false);
	const [searchResultLabel, setSearchResultLabel] = useState("");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState("");
	const [success, setSuccess] = useState("");

	useEffect(() => {
		setSearchQuery(initialSearchQuery);
	}, [initialSearchQuery]);

	async function handleSearchAddress() {
		const query = searchQuery.trim();

		if (!query) {
			setError("Introduce una dirección para buscar.");
			setSuccess("");
			return;
		}

		try {
			setSearching(true);
			setError("");
			setSuccess("");
			setSearchResultLabel("");

			const params = new URLSearchParams({ q: query });
			const response = await fetch(
				`/api/clients/${clientId}/geocode?${params.toString()}`,
				{
					method: "GET",
					cache: "no-store",
				},
			);

			const data = (await response.json()) as {
				lat?: string;
				lng?: string;
				displayName?: string | null;
				error?: string;
			};

			if (!response.ok) {
				throw new Error(data.error || "No se pudo buscar esa dirección");
			}

			const nextLat = Number(data.lat);
			const nextLng = Number(data.lng);

			if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
				throw new Error("La dirección encontrada no tiene coordenadas válidas");
			}

			setPosition({ lat: nextLat, lng: nextLng });
			setSearchResultLabel(data.displayName ?? query);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "No se pudo buscar esa dirección",
			);
		} finally {
			setSearching(false);
		}
	}

	function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
		if (event.key !== "Enter") {
			return;
		}

		event.preventDefault();
		void handleSearchAddress();
	}

	async function handleSaveLocation() {
		try {
			setSaving(true);
			setError("");
			setSuccess("");

			const response = await fetch(`/api/clients/${clientId}/location`, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					lat: position.lat,
					lng: position.lng,
				}),
			});

			const data = (await response.json()) as {
				error?: string;
			};

			if (!response.ok) {
				throw new Error(data.error || "No se pudo guardar la ubicación");
			}

			setSuccess("Ubicación guardada correctamente.");
			onLocationSaved?.(position.lat, position.lng);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : "No se pudo guardar la ubicación",
			);
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="space-y-4">
			<div
				className="rounded-3xl border border-slate-200 bg-white p-4"
			>
				<label className="text-sm font-medium text-slate-700">
					Buscar dirección
				</label>
				<div className="mt-2 flex flex-col gap-3 sm:flex-row">
					<input
						type="search"
						value={searchQuery}
						onChange={(event) => setSearchQuery(event.target.value)}
						onKeyDown={handleSearchKeyDown}
						placeholder="Calle, número, ciudad..."
						className="min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
					/>
					<button
						type="submit"
						onClick={() => void handleSearchAddress()}
						disabled={searching}
						className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{searching ? "Buscando..." : "Buscar"}
					</button>
				</div>
				{searchResultLabel ? (
					<p className="mt-2 text-sm text-slate-600">
						Resultado: {searchResultLabel}
					</p>
				) : null}
			</div>

			<div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
				<MapContainer
					center={[position.lat, position.lng]}
					zoom={16}
					scrollWheelZoom
					style={{ height: "420px", width: "100%" }}
				>
					<TileLayer
						attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
						url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
					/>

					<ClickHandler onPick={setPosition} />
					<RecenterMap position={position} />

					<Marker
						position={[position.lat, position.lng]}
						draggable
						eventHandlers={{
							dragend: (event) => {
								const marker = event.target;
								const latlng = marker.getLatLng();

								setPosition({
									lat: latlng.lat,
									lng: latlng.lng,
								});
							},
						}}
					>
						<Popup>
							Ubicación seleccionada
							<br />
							Lat: {position.lat.toFixed(6)}
							<br />
							Lng: {position.lng.toFixed(6)}
						</Popup>
					</Marker>
				</MapContainer>
			</div>

			<div className="rounded-3xl border border-slate-200 bg-white p-4">
				<p className="text-sm text-slate-600">
					Haz clic en el mapa o arrastra el marcador hasta la ubicación exacta
					del establecimiento.
				</p>

				<div className="mt-3 grid gap-3 md:grid-cols-2">
					<div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
						<span className="font-medium text-slate-700">Latitud:</span>{" "}
						<span className="text-slate-900">{position.lat.toFixed(6)}</span>
					</div>

					<div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
						<span className="font-medium text-slate-700">Longitud:</span>{" "}
						<span className="text-slate-900">{position.lng.toFixed(6)}</span>
					</div>
				</div>

				<div className="mt-4 flex flex-wrap items-center gap-3">
					<button
						type="button"
						onClick={handleSaveLocation}
						disabled={saving}
						className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
					>
						{saving ? "Guardando..." : "Guardar ubicación"}
					</button>

					{success ? (
						<p className="text-sm font-medium text-emerald-700">{success}</p>
					) : null}

					{error ? (
						<p className="text-sm font-medium text-red-600">{error}</p>
					) : null}
				</div>
			</div>
		</div>
	);
}
