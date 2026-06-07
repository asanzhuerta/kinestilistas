"use client";

import { useEffect, useRef, useState } from "react";
import {
	MapContainer,
	Marker,
	Popup,
	TileLayer,
	useMap,
	useMapEvents,
} from "react-leaflet";
import { ensureLeafletDefaultIcon } from "@/app/components/maps/leaflet-default-icon";

type ClientLocationPickerMapProps = {
	clientId: string;
	confirmedLat?: number | null;
	confirmedLng?: number | null;
	initialSearchQuery?: string;
	onConfirmLocation: (lat: number, lng: number) => void;
	compact?: boolean;
};

type LatLng = {
	lat: number;
	lng: number;
};

type GeocodeResponse = {
	lat?: string;
	lng?: string;
	displayName?: string | null;
	error?: string;
};

const DEFAULT_CENTER: LatLng = {
	lat: 36.527061,
	lng: -6.288596,
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
	confirmedLat = null,
	confirmedLng = null,
	initialSearchQuery = "",
	onConfirmLocation,
	compact = false,
}: ClientLocationPickerMapProps) {
	const initialPosition =
		confirmedLat !== null && confirmedLng !== null
			? { lat: confirmedLat, lng: confirmedLng }
			: DEFAULT_CENTER;
	const searchInputRef = useRef<HTMLInputElement | null>(null);
	const [position, setPosition] = useState<LatLng>(initialPosition);
	const [searching, setSearching] = useState(false);
	const [error, setError] = useState("");
	const [feedback, setFeedback] = useState("");
	const [searchResultLabel, setSearchResultLabel] = useState("");

	useEffect(() => {
		ensureLeafletDefaultIcon();
	}, []);

	async function handleSearchAddress() {
		const query = searchInputRef.current?.value.trim() ?? "";

		if (!query) {
			setError("Introduce una dirección para buscar.");
			setFeedback("");
			return;
		}

		try {
			setSearching(true);
			setError("");
			setFeedback("");
			setSearchResultLabel("");

			const params = new URLSearchParams({ q: query });
			const response = await fetch(
				`/api/clients/${clientId}/geocode?${params.toString()}`,
				{
					method: "GET",
					cache: "no-store",
				},
			);

			const data = (await response.json().catch(() => null)) as
				| GeocodeResponse
				| null;

			if (!response.ok) {
				throw new Error(data?.error || "No se pudo buscar esa dirección");
			}

			const nextLat = Number(data?.lat);
			const nextLng = Number(data?.lng);

			if (!Number.isFinite(nextLat) || !Number.isFinite(nextLng)) {
				throw new Error("La dirección encontrada no tiene coordenadas válidas");
			}

			setPosition({ lat: nextLat, lng: nextLng });
			setSearchResultLabel(data?.displayName ?? query);
		} catch (searchError) {
			setError(
				searchError instanceof Error
					? searchError.message
					: "No se pudo buscar esa dirección",
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

	function handleConfirmLocation() {
		onConfirmLocation(position.lat, position.lng);
		setError("");
		setFeedback(
			"Ubicación confirmada. Guarda el perfil para persistirla definitivamente.",
		);
	}

	const searchSection = (
		<div
			className={
				compact
					? "rounded-2xl border border-slate-200 bg-white p-3"
					: "rounded-3xl border border-slate-200 bg-white p-4"
			}
		>
			<label
				htmlFor="client-location-search"
				className="text-sm font-medium text-slate-700"
			>
				Buscar dirección
			</label>

			<div className="mt-2 flex flex-col gap-3 sm:flex-row">
				<input
					key={initialSearchQuery || "client-location-search-empty"}
					id="client-location-search"
					ref={searchInputRef}
					type="search"
					defaultValue={initialSearchQuery}
					onKeyDown={handleSearchKeyDown}
					placeholder="Calle, número, ciudad..."
					className={`min-w-0 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 ${
						compact ? "py-2" : "py-3"
					}`}
				/>

				<button
					type="button"
					onClick={() => void handleSearchAddress()}
					disabled={searching}
					className={`inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 ${
						compact ? "py-2" : "py-3"
					}`}
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
	);

	const mapSection = (
		<div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
			<MapContainer
				center={[position.lat, position.lng]}
				zoom={16}
				scrollWheelZoom
				style={{ height: compact ? "210px" : "420px", width: "100%" }}
			>
				<TileLayer
					attribution="&copy; OpenStreetMap contributors"
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
	);

	const confirmationSection = (
		<div
			className={
				compact
					? "rounded-2xl border border-slate-200 bg-white p-3"
					: "rounded-3xl border border-slate-200 bg-white p-4"
			}
		>
			<p className={compact ? "text-xs text-slate-600" : "text-sm text-slate-600"}>
				Haz clic en el mapa o arrastra el marcador hasta la ubicación exacta
				del establecimiento.
			</p>

			<div
				className={
					compact
						? "mt-2 grid gap-2 md:grid-cols-2"
						: "mt-3 grid gap-3 md:grid-cols-2"
				}
			>
				<div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
					<span className="font-medium text-slate-700">Latitud:</span>{" "}
					<span className="text-slate-900">{position.lat.toFixed(6)}</span>
				</div>

				<div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm">
					<span className="font-medium text-slate-700">Longitud:</span>{" "}
					<span className="text-slate-900">{position.lng.toFixed(6)}</span>
				</div>
			</div>

			<div
				className={
					compact
						? "mt-3 flex flex-wrap items-center gap-2"
						: "mt-4 flex flex-wrap items-center gap-3"
				}
			>
				<button
					type="button"
					onClick={handleConfirmLocation}
					className={`inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 ${
						compact ? "py-2" : "py-3"
					}`}
				>
					Confirmar ubicación
				</button>

				{feedback ? (
					<p className="text-sm font-medium text-emerald-700">{feedback}</p>
				) : null}

				{error ? (
					<p className="text-sm font-medium text-red-600">{error}</p>
				) : null}
			</div>
		</div>
	);

	if (compact) {
		return (
			<div className="grid gap-3 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
				<div className="space-y-3">
					{searchSection}
					{confirmationSection}
				</div>
				{mapSection}
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{searchSection}
			{mapSection}
			{confirmationSection}
		</div>
	);
}
