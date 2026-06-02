"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type RunOptions = {
	preserveData?: boolean;
};

export function useApiRequest<T>(initialData: T | null = null) {
	const initialDataRef = useRef<T | null>(initialData);
	const [data, setData] = useState<T | null>(() => initialDataRef.current);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	useEffect(() => {
		initialDataRef.current = initialData;
	}, [initialData]);

	const restoreInitialData = useCallback(() => {
		setData(initialDataRef.current);
	}, []);

	const run = useCallback(
		async (request: () => Promise<T>, options?: RunOptions) => {
			try {
				setLoading(true);
				setError("");

				if (!options?.preserveData) {
					restoreInitialData();
				}

				const nextData = await request();
				setData(nextData);
				return nextData;
			} catch (requestError) {
				setError(
					requestError instanceof Error
						? requestError.message
						: "No se pudo completar la solicitud",
				);
				return null;
			} finally {
				setLoading(false);
			}
		},
		[restoreInitialData],
	);

	const reset = useCallback(() => {
		restoreInitialData();
		setLoading(false);
		setError("");
	}, [restoreInitialData]);

	return {
		data,
		setData,
		loading,
		error,
		setError,
		run,
		reset,
	};
}
