"use client";

import {
	createContext,
	useCallback,
	useContext,
	useId,
	useLayoutEffect,
	useMemo,
	useState,
} from "react";

export type PageHeaderDescriptor = {
	title: string;
	subtitle?: string;
};

type PageHeaderState = {
	key: string | null;
	value: PageHeaderDescriptor | null;
};

type PageHeaderContextValue = {
	pageHeader: PageHeaderDescriptor | null;
	setPageHeader: (key: string, value: PageHeaderDescriptor) => void;
	clearPageHeader: (key: string) => void;
};

const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

export function PageHeaderProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const [pageHeaderState, setPageHeaderState] = useState<PageHeaderState>({
		key: null,
		value: null,
	});

	const setPageHeader = useCallback(
		(key: string, nextValue: PageHeaderDescriptor) => {
			setPageHeaderState((currentState) => {
				if (
					currentState.key === key &&
					currentState.value?.title === nextValue.title &&
					(currentState.value?.subtitle ?? "") === (nextValue.subtitle ?? "")
				) {
					return currentState;
				}

				return { key, value: nextValue };
			});
		},
		[],
	);

	const clearPageHeader = useCallback((key: string) => {
		setPageHeaderState((currentState) =>
			currentState.key === key && currentState.value !== null
				? { key: null, value: null }
				: currentState,
		);
	}, []);

	const value = useMemo<PageHeaderContextValue>(
		() => ({
			pageHeader: pageHeaderState.value,
			setPageHeader,
			clearPageHeader,
		}),
		[clearPageHeader, pageHeaderState.value, setPageHeader],
	);

	return (
		<PageHeaderContext.Provider value={value}>
			{children}
		</PageHeaderContext.Provider>
	);
}

export function usePageHeaderContext() {
	return useContext(PageHeaderContext);
}

export function usePageHeaderRegistration(header: PageHeaderDescriptor) {
	const context = usePageHeaderContext();
	const registrationKey = useId();
	const normalizedTitle = header.title.trim();
	const normalizedSubtitle = header.subtitle?.trim() ?? "";
	const setPageHeader = context?.setPageHeader;
	const clearPageHeader = context?.clearPageHeader;

	useLayoutEffect(() => {
		if (!setPageHeader || !clearPageHeader) {
			return;
		}

		setPageHeader(registrationKey, {
			title: normalizedTitle,
			subtitle: normalizedSubtitle || undefined,
		});

		return () => {
			clearPageHeader(registrationKey);
		};
	}, [
		clearPageHeader,
		normalizedSubtitle,
		normalizedTitle,
		registrationKey,
		setPageHeader,
	]);

	return Boolean(context);
}
