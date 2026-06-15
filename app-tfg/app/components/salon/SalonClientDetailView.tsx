"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import H1Title from "@/app/components/H1Title";
import PageTransition from "@/app/components/animations/PageTransition";
import { useSessionStorageState } from "@/app/hooks/useSessionStorageState";
import { requestJson } from "@/lib/api/client";
import type { ApiErrorResponse } from "@/lib/contracts/api";
import type {
	SalonClientDetail,
	SalonProductOption,
	SalonServiceSummary,
	SalonServiceTemplateSummary,
	SalonTechnicalEmailDraft,
} from "@/lib/contracts/salon";
import { formatDateShort } from "@/lib/utils/user-utils";
import {
	buildSalonColorToneLabel,
	buildSalonProductLabel,
	buildSalonProductSelectionId,
	formatSalonQuantity,
	getApiErrorMessage,
} from "./salon-ui";

type EditableProductUsage = {
	localId: string;
	selectionId: string;
	quantityUsed: string;
	notes: string;
};

type EditableResultImage = {
	localId: string;
	imageUrl: string;
	persisted: boolean;
};

type FeedbackState = {
	type: "success" | "error";
	message: string;
} | null;

type UploadSalonResultImageResponse = {
	imageUrl: string;
	publicId: string;
	message: string;
};

type DeleteSalonResultImageResponse = {
	imageUrl: string;
	message: string;
};

type Props = {
	initialDetail: SalonClientDetail;
	initialTemplates: SalonServiceTemplateSummary[];
	productOptions: SalonProductOption[];
	showOverviewPanels?: boolean;
	showServiceForm?: boolean;
	showHistory?: boolean;
	showTemplateLibrary?: boolean;
	historyHref?: string;
	title?: string;
	subtitle?: string;
};

const inputClassName =
	"w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-slate-400";

const textareaClassName = `${inputClassName} min-h-28 resize-y`;

async function cleanupTransientResultImages(images: EditableResultImage[]) {
	const transientImages = images.filter((image) => !image.persisted);

	await Promise.allSettled(
		transientImages.map((image) =>
			requestJson<DeleteSalonResultImageResponse>(
				"/api/clients/salon-service-result-images",
				{
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						imageUrl: image.imageUrl,
					}),
					fallbackMessage:
						"No se ha podido limpiar una imagen temporal del resultado",
				},
			).catch(() => null),
		),
	);
}

function createEmptyProductUsage(localId = `usage-${Date.now()}`): EditableProductUsage {
	return {
		localId,
		selectionId: "",
		quantityUsed: "",
		notes: "",
	};
}

function createProductUsageFromService(
	service: SalonServiceSummary,
	index: number,
): EditableProductUsage {
	const productUsage = service.product_usages[index];

	if (!productUsage) {
		return createEmptyProductUsage(`usage-${service.id}-${index}`);
	}

	return {
		localId: `usage-${service.id}-${productUsage.id}`,
		selectionId: buildSalonProductSelectionId(
			productUsage.product_id,
			productUsage.color_reference_id,
		),
		quantityUsed: productUsage.quantity_used ?? "",
		notes: productUsage.notes ?? "",
	};
}

function createProductUsageFromTemplate(
	template: SalonServiceTemplateSummary,
	index: number,
): EditableProductUsage {
	const productUsage = template.product_usages[index];

	if (!productUsage) {
		return createEmptyProductUsage(`template-usage-${template.id}-${index}`);
	}

	return {
		localId: `template-usage-${template.id}-${productUsage.id}`,
		selectionId: buildSalonProductSelectionId(
			productUsage.product_id,
			productUsage.color_reference_id,
		),
		quantityUsed: productUsage.quantity_used ?? "",
		notes: productUsage.notes ?? "",
	};
}

function createEditableResultImage(
	imageUrl: string,
	persisted: boolean,
	localId = `result-image-${Date.now()}-${Math.random().toString(16).slice(2)}`,
): EditableResultImage {
	return {
		localId,
		imageUrl,
		persisted,
	};
}

function buildServiceSearchValue(service: SalonServiceSummary) {
	const productSearchValue = service.product_usages
		.flatMap((productUsage) => [
			productUsage.product_name,
			productUsage.product_reference ?? "",
			productUsage.color_reference_code ?? "",
			productUsage.color_reference_name ?? "",
			productUsage.product_line_name ?? "",
			productUsage.notes ?? "",
		])
		.join(" ");

	return [
		service.service_type,
		service.result ?? "",
		service.notes ?? "",
		service.technical_description ?? "",
		service.formula ?? "",
		service.technical_notes ?? "",
		productSearchValue,
		...service.result_images.map((resultImage) => resultImage.image_url),
	]
		.join(" ")
		.toLocaleLowerCase("es");
}

export default function SalonClientDetailView({
	initialDetail,
	initialTemplates,
	productOptions,
	showOverviewPanels = true,
	showServiceForm = true,
	showHistory = true,
	showTemplateLibrary = false,
	historyHref,
	title,
	subtitle,
}: Props) {
	const productOptionsBySelectionId = new Map(
		productOptions.map((productOption) => [productOption.id, productOption]),
	);
	const [detail, setDetail] = useState(initialDetail);
	const [templates, setTemplates] =
		useState<SalonServiceTemplateSummary[]>(initialTemplates);
	const [name, setName] = useState(initialDetail.salonClient.name);
	const [phone, setPhone] = useState(initialDetail.salonClient.phone ?? "");
	const [email, setEmail] = useState(initialDetail.salonClient.email ?? "");
	const [notes, setNotes] = useState(initialDetail.salonClient.notes ?? "");
	const [serviceDate, setServiceDate] = useState(
		new Date().toISOString().slice(0, 10),
	);
	const [serviceType, setServiceType] = useState("");
	const [serviceNotes, setServiceNotes] = useState("");
	const [serviceResult, setServiceResult] = useState("");
	const [technicalDescription, setTechnicalDescription] = useState("");
	const [formula, setFormula] = useState("");
	const [technicalNotes, setTechnicalNotes] = useState("");
	const [productUsages, setProductUsages] = useState<EditableProductUsage[]>([
		createEmptyProductUsage("usage-1"),
	]);
	const [resultImages, setResultImages] = useState<EditableResultImage[]>([]);
	const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
	const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);
	const [technicalEmailDraftServiceId, setTechnicalEmailDraftServiceId] =
		useState<string | null>(null);
	const [technicalEmailDraft, setTechnicalEmailDraft] =
		useState<SalonTechnicalEmailDraft | null>(null);
	const [technicalEmailSubject, setTechnicalEmailSubject] = useState("");
	const [technicalEmailBody, setTechnicalEmailBody] = useState("");
	const [isLoadingTechnicalEmail, setIsLoadingTechnicalEmail] = useState(false);
	const salonHistoryFilterKey = `salon-client-history:${initialDetail.salonClient.id}`;
	const [historySearch, setHistorySearch] = useSessionStorageState(
		`${salonHistoryFilterKey}:search`,
		"",
	);
	const [historyServiceType, setHistoryServiceType] = useSessionStorageState(
		`${salonHistoryFilterKey}:service-type`,
		"",
	);
	const [historyDateFrom, setHistoryDateFrom] = useSessionStorageState(
		`${salonHistoryFilterKey}:date-from`,
		"",
	);
	const [historyDateTo, setHistoryDateTo] = useSessionStorageState(
		`${salonHistoryFilterKey}:date-to`,
		"",
	);
	const [isSavingProfile, setIsSavingProfile] = useState(false);
	const [isSavingService, setIsSavingService] = useState(false);
	const [templateName, setTemplateName] = useState("");
	const [selectedTemplateId, setSelectedTemplateId] = useState("");
	const [isTemplateSaveOpen, setIsTemplateSaveOpen] = useState(false);
	const [isSavingTemplate, setIsSavingTemplate] = useState(false);
	const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null);
	const [profileFeedback, setProfileFeedback] = useState<FeedbackState>(null);
	const [serviceFeedback, setServiceFeedback] = useState<FeedbackState>(null);
	const [templateFeedback, setTemplateFeedback] = useState<FeedbackState>(null);
	const [technicalEmailFeedback, setTechnicalEmailFeedback] =
		useState<FeedbackState>(null);
	const [isUploadingResultImages, setIsUploadingResultImages] = useState(false);

	useEffect(() => {
		setName(detail.salonClient.name);
		setPhone(detail.salonClient.phone ?? "");
		setEmail(detail.salonClient.email ?? "");
		setNotes(detail.salonClient.notes ?? "");
	}, [detail.salonClient]);

	useEffect(() => {
		if (!editingServiceId) {
			return;
		}

		const editingServiceStillExists = detail.services.some(
			(service) => service.id === editingServiceId,
		);

		if (!editingServiceStillExists) {
			void cleanupTransientResultImages(resultImages);
			setEditingServiceId(null);
			setServiceDate(new Date().toISOString().slice(0, 10));
			setServiceType("");
			setServiceNotes("");
			setServiceResult("");
			setTechnicalDescription("");
			setFormula("");
			setTechnicalNotes("");
			setProductUsages([createEmptyProductUsage("usage-1")]);
			setResultImages([]);
		}
	}, [detail.services, editingServiceId, resultImages]);

	useEffect(() => {
		if (!technicalEmailDraftServiceId) {
			return;
		}

		const technicalEmailServiceStillExists = detail.services.some(
			(service) => service.id === technicalEmailDraftServiceId,
		);

		if (!technicalEmailServiceStillExists) {
			resetTechnicalEmailDraft();
		}
	}, [detail.services, technicalEmailDraftServiceId]);

	function resetServiceForm(options: { cleanupTransient?: boolean } = {}) {
		if (options.cleanupTransient !== false) {
			void cleanupTransientResultImages(resultImages);
		}

		setEditingServiceId(null);
		setServiceDate(new Date().toISOString().slice(0, 10));
		setServiceType("");
		setServiceNotes("");
		setServiceResult("");
		setTechnicalDescription("");
		setFormula("");
		setTechnicalNotes("");
		setProductUsages([createEmptyProductUsage("usage-1")]);
		setResultImages([]);
		setSelectedTemplateId("");
		setTemplateName("");
		setIsTemplateSaveOpen(false);
	}

	function resetTechnicalEmailDraft() {
		setTechnicalEmailDraftServiceId(null);
		setTechnicalEmailDraft(null);
		setTechnicalEmailSubject("");
		setTechnicalEmailBody("");
		setTechnicalEmailFeedback(null);
		setIsLoadingTechnicalEmail(false);
	}

	function populateServiceForm(service: SalonServiceSummary) {
		void cleanupTransientResultImages(resultImages);
		setEditingServiceId(service.id);
		setServiceDate(service.service_date.slice(0, 10));
		setServiceType(service.service_type);
		setServiceNotes(service.notes ?? "");
		setServiceResult(service.result ?? "");
		setTechnicalDescription(service.technical_description ?? "");
		setFormula(service.formula ?? "");
		setTechnicalNotes(service.technical_notes ?? "");
		setSelectedTemplateId("");
		setIsTemplateSaveOpen(false);
		setProductUsages(
			service.product_usages.length > 0
				? service.product_usages.map((_, index) =>
						createProductUsageFromService(service, index),
					)
				: [createEmptyProductUsage(`usage-${service.id}-1`)],
		);
		setResultImages(
			service.result_images.map((resultImage, index) =>
				createEditableResultImage(
					resultImage.image_url,
					true,
					`result-image-${service.id}-${index}`,
				),
			),
		);
	}

	function applyTemplateToServiceForm(template: SalonServiceTemplateSummary) {
		void cleanupTransientResultImages(resultImages);
		setEditingServiceId(null);
		setSelectedTemplateId(template.id);
		setIsTemplateSaveOpen(false);
		setServiceType(template.service_type);
		setServiceNotes(template.notes ?? "");
		setServiceResult(template.result ?? "");
		setTechnicalDescription(template.technical_description ?? "");
		setFormula(template.formula ?? "");
		setTechnicalNotes(template.technical_notes ?? "");
		setProductUsages(
			template.product_usages.length > 0
				? template.product_usages.map((_, index) =>
						createProductUsageFromTemplate(template, index),
					)
				: [createEmptyProductUsage(`template-usage-${template.id}-1`)],
		);
		setResultImages([]);
	}

	function updateProductUsage(
		localId: string,
		field: keyof EditableProductUsage,
		value: string,
	) {
		setProductUsages((current) =>
			current.map((productUsage) =>
				productUsage.localId === localId
					? {
							...productUsage,
							[field]: value,
						}
					: productUsage,
			),
		);
	}

	function addProductUsageRow() {
		setProductUsages((current) => [
			...current,
			createEmptyProductUsage(`usage-${Date.now()}-${current.length + 1}`),
		]);
	}

	function removeProductUsageRow(localId: string) {
		setProductUsages((current) => {
			if (current.length === 1) {
				return [createEmptyProductUsage("usage-1")];
			}

			return current.filter((productUsage) => productUsage.localId !== localId);
		});
	}

	function buildProductUsagePayload() {
		return productUsages.map((productUsage) => {
			const selectedProduct =
				productOptionsBySelectionId.get(productUsage.selectionId) ?? null;

			return {
				productId: selectedProduct?.productId ?? "",
				colorReferenceId: selectedProduct?.colorReferenceId ?? null,
				quantityUsed: productUsage.quantityUsed,
				notes: productUsage.notes,
			};
		});
	}

	async function handleResultImagesUpload(
		event: React.ChangeEvent<HTMLInputElement>,
	) {
		const files = Array.from(event.target.files ?? []);

		if (files.length === 0) {
			return;
		}

		setServiceFeedback(null);
		setIsUploadingResultImages(true);

		try {
			const uploadedImages = await Promise.all(
				files.map(async (file) => {
					const uploadFormData = new FormData();
					uploadFormData.append("file", file);

					const payload = await requestJson<UploadSalonResultImageResponse>(
						"/api/clients/salon-service-result-images",
						{
							method: "POST",
							body: uploadFormData,
							fallbackMessage:
								"No se ha podido subir una imagen del resultado final",
						},
					);

					return createEditableResultImage(payload.imageUrl, false);
				}),
			);

			setResultImages((current) => [...current, ...uploadedImages]);
			setServiceFeedback({
				type: "success",
				message:
					files.length === 1
						? "Imagen de resultado subida correctamente."
						: "Imágenes de resultado subidas correctamente.",
			});
		} catch (error) {
			setServiceFeedback({
				type: "error",
				message:
					error instanceof Error
						? error.message
						: "No se ha podido subir la imagen del resultado final.",
			});
		} finally {
			setIsUploadingResultImages(false);
			event.target.value = "";
		}
	}

	async function handleRemoveResultImage(image: EditableResultImage) {
		if (!image.persisted) {
			try {
				await requestJson<DeleteSalonResultImageResponse>(
					"/api/clients/salon-service-result-images",
					{
						method: "DELETE",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							imageUrl: image.imageUrl,
						}),
						fallbackMessage:
							"No se ha podido eliminar la imagen del resultado final",
					},
				);
			} catch (error) {
				setServiceFeedback({
					type: "error",
					message:
						error instanceof Error
							? error.message
							: "No se ha podido eliminar la imagen del resultado final.",
				});
				return;
			}
		}

		setResultImages((current) =>
			current.filter((currentImage) => currentImage.localId !== image.localId),
		);
	}

	function startServiceEditing(service: SalonServiceSummary) {
		setServiceFeedback(null);
		populateServiceForm(service);
	}

	function handleApplyTemplate(template: SalonServiceTemplateSummary) {
		setTemplateFeedback(null);
		setServiceFeedback({
			type: "success",
			message: `Plantilla "${template.name}" aplicada al formulario.`,
		});
		applyTemplateToServiceForm(template);
	}

	function handleTemplateSelection(templateId: string) {
		setSelectedTemplateId(templateId);

		if (!templateId) {
			return;
		}

		const selectedTemplate = templates.find(
			(template) => template.id === templateId,
		);

		if (selectedTemplate) {
			handleApplyTemplate(selectedTemplate);
		}
	}

	async function handleSaveCurrentFormAsTemplate() {
		setTemplateFeedback(null);
		setIsSavingTemplate(true);

		try {
			const response = await fetch("/api/clients/salon-service-templates", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					name: templateName,
					serviceType,
					notes: serviceNotes,
					result: serviceResult,
					technicalDescription,
					formula,
					technicalNotes,
					productUsages: buildProductUsagePayload(),
				}),
			});
			const data = (await response.json().catch(() => null)) as
				| SalonServiceTemplateSummary
				| ApiErrorResponse
				| null;

			if (!response.ok || !data || !("id" in data)) {
				setTemplateFeedback({
					type: "error",
					message: getApiErrorMessage(
						data as ApiErrorResponse | null,
						"No se ha podido guardar la plantilla técnica.",
					),
				});
				return;
			}

			setTemplates((current) => [data, ...current]);
			setTemplateName("");
			setIsTemplateSaveOpen(false);
			setTemplateFeedback({
				type: "success",
				message: "Plantilla técnica guardada correctamente.",
			});
		} catch {
			setTemplateFeedback({
				type: "error",
				message: "No se ha podido guardar la plantilla técnica.",
			});
		} finally {
			setIsSavingTemplate(false);
		}
	}

	async function handleDeleteTemplate(template: SalonServiceTemplateSummary) {
		const confirmed = window.confirm(
			`Se eliminará la plantilla "${template.name}". Esta acción no se puede deshacer.`,
		);

		if (!confirmed) {
			return;
		}

		setTemplateFeedback(null);
		setDeletingTemplateId(template.id);

		try {
			const response = await fetch(
				`/api/clients/salon-service-templates/${template.id}`,
				{
					method: "DELETE",
				},
			);
			const data = (await response.json().catch(() => null)) as
				| { id: string }
				| ApiErrorResponse
				| null;

			if (!response.ok || !data || !("id" in data)) {
				setTemplateFeedback({
					type: "error",
					message: getApiErrorMessage(
						data as ApiErrorResponse | null,
						"No se ha podido eliminar la plantilla técnica.",
					),
				});
				return;
			}

			setTemplates((current) =>
				current.filter((currentTemplate) => currentTemplate.id !== template.id),
			);
			setSelectedTemplateId((currentTemplateId) =>
				currentTemplateId === template.id ? "" : currentTemplateId,
			);
			setTemplateFeedback({
				type: "success",
				message: "Plantilla técnica eliminada correctamente.",
			});
		} catch {
			setTemplateFeedback({
				type: "error",
				message: "No se ha podido eliminar la plantilla técnica.",
			});
		} finally {
			setDeletingTemplateId(null);
		}
	}

	function buildTechnicalEmailMailtoHref() {
		if (!technicalEmailDraft?.recipient_email) {
			return null;
		}

		const params = new URLSearchParams({
			subject: technicalEmailSubject,
			body: technicalEmailBody,
		});

		return `mailto:${technicalEmailDraft.recipient_email}?${params.toString()}`;
	}

	async function handleOpenTechnicalEmailDraft(service: SalonServiceSummary) {
		if (
			technicalEmailDraftServiceId === service.id &&
			!isLoadingTechnicalEmail
		) {
			resetTechnicalEmailDraft();
			return;
		}

		setTechnicalEmailDraftServiceId(service.id);
		setTechnicalEmailDraft(null);
		setTechnicalEmailSubject("");
		setTechnicalEmailBody("");
		setTechnicalEmailFeedback(null);
		setIsLoadingTechnicalEmail(true);

		try {
			const response = await fetch(
				`/api/clients/salon-clients/${detail.salonClient.id}/services/${service.id}/technical-email`,
			);
			const data = (await response.json().catch(() => null)) as
				| SalonTechnicalEmailDraft
				| ApiErrorResponse
				| null;

			if (!response.ok || !data || !("subject" in data)) {
				setTechnicalEmailFeedback({
					type: "error",
					message: getApiErrorMessage(
						data as ApiErrorResponse | null,
						"No se ha podido preparar el correo técnico.",
					),
				});
				return;
			}

			setTechnicalEmailDraft(data);
			setTechnicalEmailSubject(data.subject);
			setTechnicalEmailBody(data.body);
		} catch {
			setTechnicalEmailFeedback({
				type: "error",
				message: "No se ha podido preparar el correo técnico.",
			});
		} finally {
			setIsLoadingTechnicalEmail(false);
		}
	}

	async function handleCopyTechnicalEmailDraft() {
		if (!technicalEmailDraft) {
			return;
		}

		try {
			await navigator.clipboard.writeText(
				`Asunto: ${technicalEmailSubject}\n\n${technicalEmailBody}`,
			);
			setTechnicalEmailFeedback({
				type: "success",
				message: "Borrador técnico copiado al portapapeles.",
			});
		} catch {
			setTechnicalEmailFeedback({
				type: "error",
				message: "No se ha podido copiar el borrador técnico.",
			});
		}
	}

	const serviceTypeOptions = [...new Set(detail.services.map((service) => service.service_type))]
		.filter(Boolean)
		.sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));

	const normalizedHistorySearch = historySearch.trim().toLocaleLowerCase("es");
	const filteredServices = detail.services.filter((service) => {
		const serviceDateKey = service.service_date.slice(0, 10);

		if (historyServiceType && service.service_type !== historyServiceType) {
			return false;
		}

		if (historyDateFrom && serviceDateKey < historyDateFrom) {
			return false;
		}

		if (historyDateTo && serviceDateKey > historyDateTo) {
			return false;
		}

		if (!normalizedHistorySearch) {
			return true;
		}

		return buildServiceSearchValue(service).includes(normalizedHistorySearch);
	});

	async function handleProfileSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setProfileFeedback(null);
		setIsSavingProfile(true);

		try {
			const response = await fetch(
				`/api/clients/salon-clients/${detail.salonClient.id}`,
				{
					method: "PATCH",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						name,
						phone,
						email,
						notes,
					}),
				},
			);
			const data = (await response.json().catch(() => null)) as
				| typeof detail.salonClient
				| ApiErrorResponse
				| null;

			if (!response.ok || !data || !("id" in data)) {
				setProfileFeedback({
					type: "error",
					message: getApiErrorMessage(
						data as ApiErrorResponse | null,
						"No se ha podido guardar la ficha técnica.",
					),
				});
				return;
			}

			setDetail((current) => ({
				...current,
				salonClient: data,
			}));
			resetTechnicalEmailDraft();
			setProfileFeedback({
				type: "success",
				message: "Ficha técnica actualizada correctamente.",
			});
		} catch {
			setProfileFeedback({
				type: "error",
				message: "No se ha podido guardar la ficha técnica.",
			});
		} finally {
			setIsSavingProfile(false);
		}
	}

	async function handleServiceSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setServiceFeedback(null);
		setIsSavingService(true);

		const isEditingService = Boolean(editingServiceId);
		const requestUrl = isEditingService
			? `/api/clients/salon-clients/${detail.salonClient.id}/services/${editingServiceId}`
			: `/api/clients/salon-clients/${detail.salonClient.id}/services`;
		const requestMethod = isEditingService ? "PATCH" : "POST";

		try {
			const response = await fetch(requestUrl, {
				method: requestMethod,
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					serviceDate,
					serviceType,
					notes: serviceNotes,
					result: serviceResult,
					technicalDescription,
					formula,
					technicalNotes,
					productUsages: buildProductUsagePayload(),
					resultImages: resultImages.map((resultImage) => resultImage.imageUrl),
				}),
			});
			const data = (await response.json().catch(() => null)) as
				| SalonClientDetail
				| ApiErrorResponse
				| null;

			if (!response.ok || !data || !("salonClient" in data)) {
				setServiceFeedback({
					type: "error",
					message: getApiErrorMessage(
						data as ApiErrorResponse | null,
						isEditingService
							? "No se ha podido actualizar el servicio técnico."
							: "No se ha podido registrar el servicio técnico.",
					),
				});
				return;
			}

			setDetail(data);
			resetServiceForm({ cleanupTransient: false });
			resetTechnicalEmailDraft();
			setServiceFeedback({
				type: "success",
				message: isEditingService
					? "Servicio técnico actualizado correctamente."
					: "Servicio técnico registrado correctamente.",
			});
		} catch {
			setServiceFeedback({
				type: "error",
				message: isEditingService
					? "No se ha podido actualizar el servicio técnico."
					: "No se ha podido registrar el servicio técnico.",
			});
		} finally {
			setIsSavingService(false);
		}
	}

	async function handleDeleteService(service: SalonServiceSummary) {
		const confirmed = window.confirm(
			`Se eliminará el servicio "${service.service_type}" del ${formatDateShort(
				service.service_date,
			)}. Esta acción no se puede deshacer.`,
		);

		if (!confirmed) {
			return;
		}

		setServiceFeedback(null);
		setDeletingServiceId(service.id);

		try {
			const response = await fetch(
				`/api/clients/salon-clients/${detail.salonClient.id}/services/${service.id}`,
				{
					method: "DELETE",
				},
			);
			const data = (await response.json().catch(() => null)) as
				| SalonClientDetail
				| ApiErrorResponse
				| null;

			if (!response.ok || !data || !("salonClient" in data)) {
				setServiceFeedback({
					type: "error",
					message: getApiErrorMessage(
						data as ApiErrorResponse | null,
						"No se ha podido eliminar el servicio técnico.",
					),
				});
				return;
			}

			setDetail(data);

			if (editingServiceId === service.id) {
				resetServiceForm();
			}

			if (technicalEmailDraftServiceId === service.id) {
				resetTechnicalEmailDraft();
			}

			setServiceFeedback({
				type: "success",
				message: "Servicio técnico eliminado correctamente.",
			});
		} catch {
			setServiceFeedback({
				type: "error",
				message: "No se ha podido eliminar el servicio técnico.",
			});
		} finally {
			setDeletingServiceId(null);
		}
	}

	const historyCounterLabel =
		filteredServices.length === detail.services.length
			? String(detail.services.length)
			: `${filteredServices.length} / ${detail.services.length}`;
	const selectedTemplate =
		templates.find((template) => template.id === selectedTemplateId) ?? null;
	const contentGridClassName = showOverviewPanels
		? "grid gap-6 xl:grid-cols-[minmax(0,360px)_minmax(0,1fr)]"
		: "space-y-6";
	const technicalEmailMailtoHref = buildTechnicalEmailMailtoHref();

	return (
		<PageTransition>
			<H1Title
				title={title ?? detail.salonClient.name}
				subtitle={
					subtitle ??
					"Consulta la ficha técnica, el historial y las sugerencias del salón"
				}
			/>

			<div className="mb-4 flex justify-end">
				<span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
					{detail.salonClient.service_count} servicios
				</span>
			</div>

			<div className={contentGridClassName}>
				{showOverviewPanels ? (
					<div className="space-y-6">
					<section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
						<h2 className="text-lg font-semibold text-slate-900">
							Ficha técnica base
						</h2>
						<p className="mt-1 text-sm text-slate-500">
							Actualiza los datos permanentes del historial del salón.
						</p>

						<form className="mt-5 space-y-4" onSubmit={handleProfileSubmit}>
							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									Nombre
								</label>
								<input
									value={name}
									onChange={(event) => setName(event.target.value)}
									className={inputClassName}
									disabled={isSavingProfile}
								/>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									Teléfono
								</label>
								<input
									value={phone}
									onChange={(event) => setPhone(event.target.value)}
									className={inputClassName}
									disabled={isSavingProfile}
								/>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									Correo
								</label>
								<input
									type="email"
									value={email}
									onChange={(event) => setEmail(event.target.value)}
									className={inputClassName}
									disabled={isSavingProfile}
								/>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									Notas generales
								</label>
								<textarea
									value={notes}
									onChange={(event) => setNotes(event.target.value)}
									className={textareaClassName}
									disabled={isSavingProfile}
								/>
							</div>

							<div className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
								<div className="rounded-2xl bg-slate-50 px-4 py-3">
									<p className="text-xs uppercase tracking-[0.18em] text-slate-400">
										Ultimo servicio
									</p>
									<p className="mt-1 text-base font-semibold text-slate-900">
										{detail.salonClient.last_service_at
											? formatDateShort(detail.salonClient.last_service_at)
											: "Sin historial"}
									</p>
								</div>
								<div className="rounded-2xl bg-slate-50 px-4 py-3">
									<p className="text-xs uppercase tracking-[0.18em] text-slate-400">
										Sugerencias
									</p>
									<p className="mt-1 text-base font-semibold text-slate-900">
										{detail.suggestions.length}
									</p>
								</div>
							</div>

							{profileFeedback ? (
								<div
									className={`rounded-2xl px-4 py-3 text-sm ${
										profileFeedback.type === "success"
											? "bg-emerald-50 text-emerald-700"
											: "bg-rose-50 text-rose-700"
									}`}
								>
									{profileFeedback.message}
								</div>
							) : null}

							<button
								type="submit"
								disabled={isSavingProfile}
								className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
							>
								{isSavingProfile ? "Guardando..." : "Guardar ficha"}
							</button>
						</form>
					</section>

					<section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
						<h2 className="text-lg font-semibold text-slate-900">
							Sugerencias de producto
						</h2>
						<p className="mt-1 text-sm text-slate-500">
							Se recalculan automáticamente a partir del historial técnico ya
							registrado.
						</p>

						{detail.suggestions.length === 0 ? (
							<div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
								Aún no hay suficientes usos de producto como para proponer
								referencias.
							</div>
						) : (
							<div className="mt-5 space-y-3">
								{detail.suggestions.map((suggestion) => (
									<div
										key={suggestion.id}
										className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
									>
										<p className="text-sm font-semibold text-slate-900">
											{suggestion.product_name}
											{suggestion.product_reference
												? ` · ${suggestion.product_reference}`
												: ""}
										</p>
										<p className="mt-1 text-sm text-slate-500">
											{suggestion.product_line_name || "Sin línea"}
										</p>
										<p className="mt-3 text-sm leading-6 text-slate-600">
											{suggestion.reason}
										</p>
									</div>
								))}
							</div>
						)}
					</section>
					</div>
				) : null}

				<div className="space-y-6">
					{showTemplateLibrary ? (
					<section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<h2 className="text-lg font-semibold text-slate-900">
									Plantillas técnicas
								</h2>
								<p className="mt-1 text-sm text-slate-500">
									Guarda técnicas recurrentes del salón y reutilízalas antes de
									registrar un nuevo servicio.
								</p>
							</div>
							<span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
								{templates.length}
							</span>
						</div>

						<div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-4">
							<div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
								<div>
									<label className="mb-2 block text-sm font-medium text-slate-700">
										Nombre de la plantilla
									</label>
									<input
										value={templateName}
										onChange={(event) => setTemplateName(event.target.value)}
										className={inputClassName}
										placeholder="Ej. Matiz beige habitual"
										disabled={isSavingTemplate}
									/>
								</div>
								<div className="flex items-end">
									<button
										type="button"
										onClick={handleSaveCurrentFormAsTemplate}
										disabled={isSavingTemplate}
										className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
									>
										{isSavingTemplate
											? "Guardando..."
											: "Guardar formulario actual"}
									</button>
								</div>
							</div>
							<p className="mt-3 text-sm text-slate-500">
								Se guardan el tipo de servicio, el resultado, la descripción
								técnica, la formula, las notas y los productos usados que haya
								ahora mismo en el formulario.
							</p>
						</div>

						{templateFeedback ? (
							<div
								className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
									templateFeedback.type === "success"
										? "bg-emerald-50 text-emerald-700"
										: "bg-rose-50 text-rose-700"
								}`}
							>
								{templateFeedback.message}
							</div>
						) : null}

						{templates.length === 0 ? (
							<div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
								Aún no hay plantillas guardadas. Puedes preparar un servicio en
								el formulario y guardarlo para reutilizarlo después.
							</div>
						) : (
							<div className="mt-5 grid gap-4 xl:grid-cols-2">
								{templates.map((template) => (
									<article
										key={template.id}
										className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4"
									>
										<div className="flex flex-wrap items-start justify-between gap-3">
											<div>
												<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
													Plantilla
												</p>
												<h3 className="mt-1 text-base font-semibold text-slate-900">
													{template.name}
												</h3>
												<p className="mt-1 text-sm text-slate-500">
													{template.service_type}
												</p>
											</div>
											<div className="flex flex-wrap items-center gap-2">
												<span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
													{template.product_usages.length} productos
												</span>
												<button
													type="button"
													onClick={() => handleApplyTemplate(template)}
													disabled={
														isSavingService ||
														isSavingTemplate ||
														deletingTemplateId === template.id
													}
													className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
												>
													Aplicar
												</button>
												<button
													type="button"
													onClick={() => handleDeleteTemplate(template)}
													disabled={
														isSavingTemplate ||
														deletingTemplateId === template.id
													}
													className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
												>
													{deletingTemplateId === template.id
														? "Eliminando..."
														: "Eliminar"}
												</button>
											</div>
										</div>

										<div className="mt-4 grid gap-3 md:grid-cols-2">
											<div className="rounded-2xl bg-white px-4 py-3">
												<p className="text-xs uppercase tracking-[0.18em] text-slate-400">
													Formula
												</p>
												<p className="mt-2 text-sm leading-6 text-slate-700">
													{template.formula || "Sin formula registrada"}
												</p>
											</div>
											<div className="rounded-2xl bg-white px-4 py-3">
												<p className="text-xs uppercase tracking-[0.18em] text-slate-400">
													Resumen del resultado
												</p>
												<p className="mt-2 text-sm leading-6 text-slate-700">
													{template.result || "Sin resumen descrito"}
												</p>
											</div>
										</div>

										{template.technical_description ? (
											<p className="mt-4 text-sm leading-6 text-slate-600">
												{template.technical_description}
											</p>
										) : null}
									</article>
								))}
							</div>
						)}
					</section>
					) : null}

					{showServiceForm ? (
					<section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<h2 className="text-lg font-semibold text-slate-900">
									{editingServiceId
										? "Editar servicio técnico"
										: "Registrar servicio técnico"}
								</h2>
								<p className="mt-1 text-sm text-slate-500">
									{editingServiceId
										? "Corrige la ficha técnica y vuelve a recalcular las sugerencias."
										: "Documenta el trabajo realizado, la formula y el producto usado."}
								</p>
							</div>
							{historyHref ? (
								<Link
									href={historyHref}
									className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
								>
									Ver historial técnico
								</Link>
							) : null}
							{editingServiceId ? (
								<button
									type="button"
									onClick={() => resetServiceForm()}
									disabled={isSavingService || isUploadingResultImages}
									className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
								>
									Cancelar edición
								</button>
							) : null}
						</div>

						<form className="mt-5 space-y-4" onSubmit={handleServiceSubmit}>
							{!editingServiceId ? (
								<div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div>
											<h3 className="text-base font-semibold text-slate-900">
												¿Desea reutilizar una plantilla?
											</h3>
											<p className="mt-1 text-sm leading-6 text-slate-500">
												Una plantilla técnica es una receta reutilizable del
												servicio: guarda tipo, resultado, fórmula, notas y
												productos para cargarlos sin repetirlos a mano.
											</p>
										</div>
										<span className="rounded-full bg-white px-3 py-1 text-sm font-medium text-slate-700">
											{templates.length} plantillas
										</span>
									</div>

									{templates.length === 0 ? (
										<div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-5 text-sm text-slate-500">
											Aún no hay plantillas guardadas para reutilizar.
										</div>
									) : (
										<div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
											<select
												value={selectedTemplateId}
												onChange={(event) =>
													handleTemplateSelection(event.target.value)
												}
												className={inputClassName}
												disabled={isSavingService}
											>
												<option value="">No reutilizar plantilla</option>
												{templates.map((template) => (
													<option key={template.id} value={template.id}>
														{template.name} - {template.service_type}
													</option>
												))}
											</select>
											{selectedTemplate ? (
												<button
													type="button"
													onClick={() => handleDeleteTemplate(selectedTemplate)}
													disabled={
														isSavingTemplate ||
														deletingTemplateId === selectedTemplate.id
													}
													className="rounded-full border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
												>
													{deletingTemplateId === selectedTemplate.id
														? "Eliminando..."
														: "Eliminar plantilla"}
												</button>
											) : null}
										</div>
									)}
								</div>
							) : null}

							{editingServiceId ? (
								<div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
									Estás editando un servicio ya registrado. Al guardar, se
									actualizara también la sugerencia de producto asociada al
									historial.
								</div>
							) : null}

							<div className="grid gap-4 md:grid-cols-2">
								<div>
									<label className="mb-2 block text-sm font-medium text-slate-700">
										Fecha del servicio
									</label>
									<input
										type="date"
										value={serviceDate}
										onChange={(event) => setServiceDate(event.target.value)}
										className={inputClassName}
										disabled={isSavingService}
									/>
								</div>
								<div>
									<label className="mb-2 block text-sm font-medium text-slate-700">
										Tipo de servicio
									</label>
									<input
										value={serviceType}
										onChange={(event) => setServiceType(event.target.value)}
										className={inputClassName}
										placeholder="Coloración, matiz, tratamiento..."
										disabled={isSavingService}
									/>
								</div>
							</div>

							<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
								<div className="space-y-4">
									<div>
										<label className="mb-2 block text-sm font-medium text-slate-700">
											Resumen del resultado
										</label>
										<textarea
											value={serviceResult}
											onChange={(event) => setServiceResult(event.target.value)}
											className={textareaClassName}
											placeholder="Acabado, matiz conseguido, brillo, cobertura..."
											disabled={isSavingService}
										/>
									</div>

									<div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
										<div className="flex flex-wrap items-center justify-between gap-3">
											<div>
												<h3 className="text-base font-semibold text-slate-900">
													Resultado final
												</h3>
												<p className="mt-1 text-sm text-slate-500">
													Sube tantas imágenes como necesites para documentar
													como ha quedado el trabajo.
												</p>
											</div>
											<label className="inline-flex cursor-pointer items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
												<input
													type="file"
													accept="image/*"
													multiple
													onChange={handleResultImagesUpload}
													className="hidden"
													disabled={isSavingService || isUploadingResultImages}
												/>
												{isUploadingResultImages
													? "Subiendo..."
													: "Añadir imágenes"}
											</label>
										</div>

										{resultImages.length === 0 ? (
											<div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-sm text-slate-500">
												Aún no has subido imágenes del resultado final.
											</div>
										) : (
											<div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
												{resultImages.map((resultImage, index) => (
													<div
														key={resultImage.localId}
														className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
													>
														<div className="relative aspect-square bg-slate-100">
															<Image
																src={resultImage.imageUrl}
																alt={`Resultado final ${index + 1}`}
																fill
																className="object-cover"
																sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 240px"
															/>
														</div>
														<div className="flex items-center justify-between gap-3 px-4 py-3">
															<span className="text-sm text-slate-500">
																Imagen {index + 1}
															</span>
															<button
																type="button"
																onClick={() =>
																	handleRemoveResultImage(resultImage)
																}
																className="text-sm font-medium text-rose-600 transition hover:text-rose-500"
																disabled={
																	isSavingService || isUploadingResultImages
																}
															>
																Quitar
															</button>
														</div>
													</div>
												))}
											</div>
										)}
									</div>
								</div>
								<div>
									<label className="mb-2 block text-sm font-medium text-slate-700">
										Notas del servicio
									</label>
									<textarea
										value={serviceNotes}
										onChange={(event) => setServiceNotes(event.target.value)}
										className={textareaClassName}
										placeholder="Incidencias, observaciones generales..."
										disabled={isSavingService}
									/>
								</div>
							</div>

							<div className="grid gap-4 md:grid-cols-3">
								<div className="md:col-span-2">
									<label className="mb-2 block text-sm font-medium text-slate-700">
										Descripción técnica
									</label>
									<textarea
										value={technicalDescription}
										onChange={(event) =>
											setTechnicalDescription(event.target.value)
										}
										className={textareaClassName}
										placeholder="Diagnóstico, técnica aplicada, particiones..."
										disabled={isSavingService}
									/>
								</div>
								<div>
									<label className="mb-2 block text-sm font-medium text-slate-700">
										Formula
									</label>
									<textarea
										value={formula}
										onChange={(event) => setFormula(event.target.value)}
										className={textareaClassName}
										placeholder="Ej. 7.34 + 20 vol + corrector..."
										disabled={isSavingService}
									/>
								</div>
							</div>

							<div>
								<label className="mb-2 block text-sm font-medium text-slate-700">
									Notas técnicas
								</label>
								<textarea
									value={technicalNotes}
									onChange={(event) => setTechnicalNotes(event.target.value)}
									className={textareaClassName}
									placeholder="Tiempos de exposicion, mezcla, observaciones de mantenimiento..."
									disabled={isSavingService}
								/>
							</div>

							<div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
								<div className="mb-4 flex items-center justify-between gap-3">
									<div>
										<h3 className="text-base font-semibold text-slate-900">
											Productos usados
										</h3>
										<p className="mt-1 text-sm text-slate-500">
											Anade solo los productos realmente aplicados.
										</p>
									</div>
									<button
										type="button"
										onClick={addProductUsageRow}
										className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
									>
										Añadir producto
									</button>
								</div>

								<div className="space-y-3">
									{productUsages.map((productUsage, index) => (
										<div
											key={productUsage.localId}
											className="rounded-2xl border border-slate-200 bg-white p-4"
										>
											<div className="mb-3 flex items-center justify-between gap-3">
												<p className="text-sm font-semibold text-slate-900">
													Producto {index + 1}
												</p>
												<button
													type="button"
													onClick={() => removeProductUsageRow(productUsage.localId)}
													className="text-sm font-medium text-rose-600 transition hover:text-rose-500"
												>
													Quitar
												</button>
											</div>

											<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
												<select
													value={productUsage.selectionId}
													onChange={(event) =>
														updateProductUsage(
															productUsage.localId,
															"selectionId",
															event.target.value,
														)
													}
													className={inputClassName}
													disabled={isSavingService}
												>
													<option value="">Selecciona un producto</option>
													{productOptions.map((productOption) => (
														<option key={productOption.id} value={productOption.id}>
															{buildSalonProductLabel(productOption)}
														</option>
													))}
												</select>

												<input
													value={productUsage.quantityUsed}
													onChange={(event) =>
														updateProductUsage(
															productUsage.localId,
															"quantityUsed",
															event.target.value,
														)
													}
													className={inputClassName}
													placeholder="Cantidad"
													disabled={isSavingService}
												/>
											</div>

											<textarea
												value={productUsage.notes}
												onChange={(event) =>
													updateProductUsage(
														productUsage.localId,
														"notes",
														event.target.value,
													)
												}
												className={`${textareaClassName} mt-3 min-h-20`}
												placeholder="Notas del uso de este producto"
												disabled={isSavingService}
											/>
										</div>
									))}
								</div>
							</div>

							{serviceFeedback ? (
								<div
									className={`rounded-2xl px-4 py-3 text-sm ${
										serviceFeedback.type === "success"
											? "bg-emerald-50 text-emerald-700"
											: "bg-rose-50 text-rose-700"
									}`}
								>
									{serviceFeedback.message}
								</div>
							) : null}

							<button
								type="submit"
								disabled={isSavingService || isUploadingResultImages}
								className="inline-flex rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
							>
								{isUploadingResultImages
									? "Subiendo imágenes..."
									: isSavingService
									? editingServiceId
										? "Actualizando..."
										: "Registrando..."
									: editingServiceId
										? "Guardar cambios"
										: "Registrar servicio"}
							</button>

							{!editingServiceId ? (
								<div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
									<div className="flex flex-wrap items-center justify-between gap-3">
										<div>
											<h3 className="text-base font-semibold text-slate-900">
												¿Guardar como plantilla?
											</h3>
											<p className="mt-1 text-sm text-slate-500">
												Guarda los datos actuales para reutilizarlos en próximos
												servicios técnicos.
											</p>
										</div>
										<button
											type="button"
											onClick={() =>
												setIsTemplateSaveOpen((currentValue) => !currentValue)
											}
											disabled={isSavingService || isSavingTemplate}
											className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
										>
											{isTemplateSaveOpen ? "Ocultar" : "¿Guardar como plantilla?"}
										</button>
									</div>

									{isTemplateSaveOpen ? (
										<div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
											<div>
												<label className="mb-2 block text-sm font-medium text-slate-700">
													Nombre de la plantilla
												</label>
												<input
													value={templateName}
													onChange={(event) =>
														setTemplateName(event.target.value)
													}
													className={inputClassName}
													placeholder="Ej. Matiz beige habitual"
													disabled={isSavingTemplate}
												/>
											</div>
											<div className="flex items-end">
												<button
													type="button"
													onClick={handleSaveCurrentFormAsTemplate}
													disabled={isSavingTemplate}
													className="inline-flex w-full items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
												>
													{isSavingTemplate
														? "Guardando..."
														: "Guardar plantilla"}
												</button>
											</div>
										</div>
									) : null}

									{templateFeedback ? (
										<div
											className={`mt-4 rounded-2xl px-4 py-3 text-sm ${
												templateFeedback.type === "success"
													? "bg-emerald-50 text-emerald-700"
													: "bg-rose-50 text-rose-700"
											}`}
										>
											{templateFeedback.message}
										</div>
									) : null}
								</div>
							) : null}
						</form>
					</section>
					) : null}

					{showHistory ? (
					<section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm">
						<div className="mb-5 flex items-center justify-between gap-3">
							<div>
								<h2 className="text-lg font-semibold text-slate-900">
									Historial técnico
								</h2>
								<p className="mt-1 text-sm text-slate-500">
									Consulta, filtra y corrige todos los trabajos ya registrados
									para este cliente.
								</p>
							</div>
							<span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
								{historyCounterLabel}
							</span>
						</div>

						<div className="mb-5 grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2 xl:grid-cols-4">
							<input
								value={historySearch}
								onChange={(event) => setHistorySearch(event.target.value)}
								className={inputClassName}
								placeholder="Buscar por técnica, formula o producto"
							/>
							<select
								value={historyServiceType}
								onChange={(event) => setHistoryServiceType(event.target.value)}
								className={inputClassName}
							>
								<option value="">Todos los tipos</option>
								{serviceTypeOptions.map((serviceTypeOption) => (
									<option key={serviceTypeOption} value={serviceTypeOption}>
										{serviceTypeOption}
									</option>
								))}
							</select>
							<input
								type="date"
								value={historyDateFrom}
								onChange={(event) => setHistoryDateFrom(event.target.value)}
								className={inputClassName}
							/>
							<input
								type="date"
								value={historyDateTo}
								onChange={(event) => setHistoryDateTo(event.target.value)}
								className={inputClassName}
							/>
							<button
								type="button"
								onClick={() => {
									setHistorySearch("");
									setHistoryServiceType("");
									setHistoryDateFrom("");
									setHistoryDateTo("");
								}}
								className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 md:col-span-2 xl:col-span-4"
							>
								Limpiar filtros
							</button>
						</div>

						{filteredServices.length === 0 ? (
							<div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
								{detail.services.length === 0
									? "Aún no hay servicios registrados para esta ficha."
									: "No hay servicios que coincidan con los filtros actuales."}
							</div>
						) : (
							<div className="space-y-4">
								{filteredServices.map((service) => (
									<article
										key={service.id}
										className={`rounded-3xl border p-5 ${
											editingServiceId === service.id
												? "border-slate-900 bg-white shadow-sm"
												: "border-slate-200 bg-slate-50/80"
										}`}
									>
										<div className="flex flex-wrap items-start justify-between gap-3">
											<div>
												<p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
													{formatDateShort(service.service_date)}
												</p>
												<h3 className="mt-1 text-lg font-semibold text-slate-900">
													{service.service_type}
												</h3>
											</div>
											<div className="flex flex-wrap items-center justify-end gap-2">
												<span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
													{service.product_usages.length} productos
												</span>
												<button
													type="button"
													onClick={() => handleOpenTechnicalEmailDraft(service)}
													disabled={
														isSavingService || deletingServiceId === service.id
													}
													className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
												>
													{technicalEmailDraftServiceId === service.id &&
													!isLoadingTechnicalEmail
														? "Ocultar correo"
														: isLoadingTechnicalEmail &&
																technicalEmailDraftServiceId === service.id
															? "Preparando..."
															: "Correo técnico"}
												</button>
												<button
													type="button"
													onClick={() => startServiceEditing(service)}
													disabled={
														isSavingService || deletingServiceId === service.id
													}
													className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
												>
													Editar
												</button>
												<button
													type="button"
													onClick={() => handleDeleteService(service)}
													disabled={
														isSavingService || deletingServiceId === service.id
													}
													className="rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
												>
													{deletingServiceId === service.id
														? "Eliminando..."
														: "Eliminar"}
												</button>
											</div>
										</div>

										{technicalEmailDraftServiceId === service.id ? (
											<div className="mt-4 rounded-3xl border border-slate-200 bg-white px-4 py-4">
												<div className="flex flex-wrap items-start justify-between gap-3">
													<div>
														<p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
															Correo técnico
														</p>
														<p className="mt-1 text-sm text-slate-500">
															Prepara un borrador editable para compartir este
															seguimiento con el cliente.
														</p>
													</div>
													<button
														type="button"
														onClick={resetTechnicalEmailDraft}
														className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
													>
														Cerrar
													</button>
												</div>

												{isLoadingTechnicalEmail ? (
													<div className="mt-4 rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
														Preparando borrador técnico...
													</div>
												) : technicalEmailDraft ? (
													<div className="mt-4 space-y-4">
														<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
															<div>
																<label className="mb-2 block text-sm font-medium text-slate-700">
																	Destinataria
																</label>
																<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
																	<p className="font-semibold text-slate-900">
																		{technicalEmailDraft.recipient_name}
																	</p>
																	<p className="mt-1 text-slate-500">
																		{technicalEmailDraft.recipient_email ||
																			"Sin correo en la ficha"}
																	</p>
																</div>
															</div>
															<div>
																<label className="mb-2 block text-sm font-medium text-slate-700">
																	Generado
																</label>
																<div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
																	{formatDateShort(technicalEmailDraft.generated_at)}
																</div>
															</div>
														</div>

														<div>
															<label className="mb-2 block text-sm font-medium text-slate-700">
																Asunto
															</label>
															<input
																value={technicalEmailSubject}
																onChange={(event) =>
																	setTechnicalEmailSubject(event.target.value)
																}
																className={inputClassName}
															/>
														</div>

														<div>
															<label className="mb-2 block text-sm font-medium text-slate-700">
																Cuerpo del correo
															</label>
															<textarea
																value={technicalEmailBody}
																onChange={(event) =>
																	setTechnicalEmailBody(event.target.value)
																}
																className={`${textareaClassName} min-h-72`}
															/>
														</div>

														<div className="flex flex-wrap gap-2">
															<button
																type="button"
																onClick={handleCopyTechnicalEmailDraft}
																className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
															>
																Copiar borrador
															</button>
															{technicalEmailMailtoHref ? (
																<a
																	href={technicalEmailMailtoHref}
																	className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
																>
																	Abrir en correo
																</a>
															) : (
																<span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
																	Anade un correo en la ficha para abrir el cliente
																</span>
															)}
														</div>

														{technicalEmailFeedback ? (
															<div
																className={`rounded-2xl px-4 py-3 text-sm ${
																	technicalEmailFeedback.type === "success"
																		? "bg-emerald-50 text-emerald-700"
																		: "bg-rose-50 text-rose-700"
																}`}
															>
																{technicalEmailFeedback.message}
															</div>
														) : null}
													</div>
												) : (
													<div className="mt-4 rounded-2xl bg-rose-50 px-4 py-4 text-sm text-rose-700">
														{technicalEmailFeedback?.message ||
															"No se ha podido preparar el borrador técnico."}
													</div>
												)}
											</div>
										) : null}

										<div className="mt-4 grid gap-4 lg:grid-cols-2">
											<div className="rounded-2xl bg-white px-4 py-4">
												<p className="text-xs uppercase tracking-[0.18em] text-slate-400">
													Resumen del resultado
												</p>
												<p className="mt-2 text-sm leading-6 text-slate-700">
													{service.result || "Sin resumen descrito"}
												</p>
											</div>
											<div className="rounded-2xl bg-white px-4 py-4">
												<p className="text-xs uppercase tracking-[0.18em] text-slate-400">
													Formula
												</p>
												<p className="mt-2 text-sm leading-6 text-slate-700">
													{service.formula || "Sin formula registrada"}
												</p>
											</div>
										</div>

										<div className="mt-4 rounded-2xl bg-white px-4 py-4">
											<p className="text-xs uppercase tracking-[0.18em] text-slate-400">
												Resultado final
											</p>

											{service.result_images.length === 0 ? (
												<p className="mt-2 text-sm text-slate-500">
													No se han subido imágenes del resultado final.
												</p>
											) : (
												<div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
													{service.result_images.map((resultImage, index) => (
														<div
															key={resultImage.id}
															className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50"
														>
															<div className="relative aspect-square bg-slate-100">
																<Image
																	src={resultImage.image_url}
																	alt={`Resultado final ${index + 1}`}
																	fill
																	className="object-cover"
																	sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 240px"
																/>
															</div>
														</div>
													))}
												</div>
											)}
										</div>

										<div className="mt-4 grid gap-4 lg:grid-cols-2">
											<div className="rounded-2xl bg-white px-4 py-4">
												<p className="text-xs uppercase tracking-[0.18em] text-slate-400">
													Descripción técnica
												</p>
												<p className="mt-2 text-sm leading-6 text-slate-700">
													{service.technical_description ||
														"Sin descripción técnica"}
												</p>
											</div>
											<div className="rounded-2xl bg-white px-4 py-4">
												<p className="text-xs uppercase tracking-[0.18em] text-slate-400">
													Notas técnicas
												</p>
												<p className="mt-2 text-sm leading-6 text-slate-700">
													{service.technical_notes || "Sin notas técnicas"}
												</p>
											</div>
										</div>

										{service.notes ? (
											<div className="mt-4 rounded-2xl bg-white px-4 py-4">
												<p className="text-xs uppercase tracking-[0.18em] text-slate-400">
													Notas del servicio
												</p>
												<p className="mt-2 text-sm leading-6 text-slate-700">
													{service.notes}
												</p>
											</div>
										) : null}

										<div className="mt-4 rounded-2xl bg-white px-4 py-4">
											<p className="text-xs uppercase tracking-[0.18em] text-slate-400">
												Productos usados
											</p>

											{service.product_usages.length === 0 ? (
												<p className="mt-2 text-sm text-slate-500">
													No se registraron productos concretos en este
													servicio.
												</p>
											) : (
												<div className="mt-3 space-y-3">
													{service.product_usages.map((productUsage) => (
														<div
															key={productUsage.id}
															className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
														>
															<div className="flex flex-wrap items-start justify-between gap-3">
																<div>
																	<p className="text-sm font-semibold text-slate-900">
																		{productUsage.product_name}
																		{productUsage.product_reference
																			? ` · ${productUsage.product_reference}`
																			: ""}
																	</p>
																	<p className="mt-1 text-sm text-slate-500">
																		{productUsage.product_line_name || "Sin línea"}
																	</p>
																	{productUsage.color_reference_code ||
																	productUsage.color_reference_name ? (
																		<p className="mt-1 text-sm text-slate-500">
																			{buildSalonColorToneLabel({
																				colorReferenceCode:
																					productUsage.color_reference_code,
																				colorReferenceName:
																					productUsage.color_reference_name,
																			})}
																		</p>
																	) : null}
																</div>
																{productUsage.quantity_used ? (
																	<span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-600">
																		{formatSalonQuantity(productUsage.quantity_used)} uds
																	</span>
																) : null}
															</div>
															{productUsage.notes ? (
																<p className="mt-3 text-sm leading-6 text-slate-600">
																	{productUsage.notes}
																</p>
															) : null}
														</div>
													))}
												</div>
											)}
										</div>
									</article>
								))}
							</div>
						)}
					</section>
					) : null}
				</div>
			</div>
		</PageTransition>
	);
}
