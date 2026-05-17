"use client";

import { useCallback, useEffect } from "react";
import { requestJson } from "@/lib/api/client";
import type {
	CommercialVisitDetail,
	UpdateCommercialVisitBody,
} from "@/lib/contracts/commercial-visit";
import { useApiRequest } from "./useApiRequest";

export function useCommercialVisit(visitId: string) {
	const { run, ...request } = useApiRequest<CommercialVisitDetail>();

	const load = useCallback(() => {
		if (!visitId) {
			return Promise.resolve(null);
		}

		return run(() =>
			requestJson<CommercialVisitDetail>(`/api/commercial/visits/${visitId}`, {
				method: "GET",
				cache: "no-store",
				fallbackMessage: "No se pudo obtener la visita",
			}),
		);
	}, [run, visitId]);

	const save = useCallback(
		(payload: UpdateCommercialVisitBody) => {
			if (!visitId) {
				return Promise.resolve(null);
			}

			return run(
				() =>
					requestJson<CommercialVisitDetail>(`/api/commercial/visits/${visitId}`, {
						method: "PATCH",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify(payload),
						fallbackMessage: "No se pudo actualizar la visita",
					}),
				{ preserveData: true },
			);
		},
		[run, visitId],
	);

	useEffect(() => {
		void load();
	}, [load]);

	return {
		...request,
		reload: load,
		save,
	};
}
