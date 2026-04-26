"use client";

import { useCallback, useEffect, useState } from "react";
import {
	fetchAdminCommercialOptions,
	type AdminCommercialOption,
} from "@/app/admin/users/_shared/admin-commercial-options";

export function useAdminCommercialOptions(enabled = true) {
	const [options, setOptions] = useState<AdminCommercialOption[]>([]);
	const [loading, setLoading] = useState(enabled);
	const [error, setError] = useState("");

	const load = useCallback(async () => {
		if (!enabled) {
			setOptions([]);
			setLoading(false);
			setError("");
			return [];
		}

		try {
			setLoading(true);
			setError("");

			const nextOptions = await fetchAdminCommercialOptions();
			setOptions(nextOptions);
			return nextOptions;
		} catch (loadError) {
			setError(
				loadError instanceof Error
					? loadError.message
					: "No se pudieron cargar los comerciales",
			);
			return [];
		} finally {
			setLoading(false);
		}
	}, [enabled]);

	useEffect(() => {
		let ignore = false;

		async function syncOptions() {
			if (!enabled) {
				setOptions([]);
				setLoading(false);
				setError("");
				return;
			}

			try {
				setLoading(true);
				setError("");
				const nextOptions = await fetchAdminCommercialOptions();

				if (ignore) {
					return;
				}

				setOptions(nextOptions);
			} catch (loadError) {
				if (ignore) {
					return;
				}

				setError(
					loadError instanceof Error
						? loadError.message
						: "No se pudieron cargar los comerciales",
				);
			} finally {
				if (!ignore) {
					setLoading(false);
				}
			}
		}

		void syncOptions();

		return () => {
			ignore = true;
		};
	}, [enabled]);

	return {
		options,
		loading,
		error,
		reload: load,
	};
}
