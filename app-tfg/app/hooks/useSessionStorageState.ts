"use client";

import { useEffect, useState } from "react";

const UI_STATE_STORAGE_PREFIX = "kinestilistas:ui-state:";

type UseSessionStorageStateOptions<T> = {
	parse?: (value: unknown) => T | null;
};

function readStoredValue<T>(
	key: string,
	fallback: T,
	parse?: (value: unknown) => T | null,
) {
	if (typeof window === "undefined") {
		return fallback;
	}

	try {
		const raw = window.sessionStorage.getItem(`${UI_STATE_STORAGE_PREFIX}${key}`);

		if (!raw) {
			return fallback;
		}

		const parsed = JSON.parse(raw);
		return parse ? (parse(parsed) ?? fallback) : (parsed as T);
	} catch {
		return fallback;
	}
}

function writeStoredValue<T>(key: string, value: T) {
	if (typeof window === "undefined") {
		return;
	}

	try {
		window.sessionStorage.setItem(
			`${UI_STATE_STORAGE_PREFIX}${key}`,
			JSON.stringify(value),
		);
	} catch {
		// El filtro debe seguir funcionando aunque el navegador no permita storage.
	}
}

export function useSessionStorageState<T>(
	key: string,
	initialValue: T,
	options: UseSessionStorageStateOptions<T> = {},
) {
	const [value, setValue] = useState(initialValue);
	const [hasLoadedStoredValue, setHasLoadedStoredValue] = useState(false);

	useEffect(() => {
		const restoreTimeout = window.setTimeout(() => {
			setValue(readStoredValue(key, initialValue, options.parse));
			setHasLoadedStoredValue(true);
		}, 0);

		return () => window.clearTimeout(restoreTimeout);
	}, [initialValue, key, options.parse]);

	useEffect(() => {
		if (!hasLoadedStoredValue) {
			return;
		}

		writeStoredValue(key, value);
	}, [hasLoadedStoredValue, key, value]);

	return [value, setValue] as const;
}
