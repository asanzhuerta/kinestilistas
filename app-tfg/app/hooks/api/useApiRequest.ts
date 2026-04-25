"use client";

import { useCallback, useState } from "react";

type RunOptions = {
	preserveData?: boolean;
};

export function useApiRequest<T>(initialData: T | null = null) {
	const [data, setData] = useState<T | null>(initialData);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");

	const run = useCallback(
		async (request: () => Promise<T>, options?: RunOptions) => {
			try {
				setLoading(true);
				setError("");

				if (!options?.preserveData) {
					setData(initialData);
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
		[initialData],
	);

	return {
		data,
		setData,
		loading,
		error,
		setError,
		run,
		reset() {
			setData(initialData);
			setLoading(false);
			setError("");
		},
	};
}
