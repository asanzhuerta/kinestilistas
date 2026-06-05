"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import SafeForm from "@/app/components/forms/SafeForm";
import { ApiClientError, requestJson } from "@/lib/api/client";
import type { UploadProfileImageResponse } from "@/lib/contracts/user-profile";
import CatalogImageUploadField from "./CatalogImageUploadField";
import type { FieldDescriptor, FormValue } from "./catalog-admin-types";

type Props = {
	entityLabel: string;
	entityLabelPlural: string;
	basePath: string;
	apiBasePath: string;
	initialValues: Record<string, FormValue>;
	fields: FieldDescriptor[];
	editingId?: string | null;
	editingTitle?: string | null;
	cancelHref?: string | null;
	showHeader?: boolean;
	editPathPattern?: string;
	createRedirectToEdit?: boolean;
};

function getFieldStringValue(value: FormValue | undefined) {
	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}

	return value ?? "";
}

function resolveEditPath(pattern: string, id: string) {
	return pattern.replace("[id]", id);
}

function getFilteredOptions(
	field: FieldDescriptor,
	formValues: Record<string, FormValue>,
) {
	if (!field.options) {
		return [];
	}

	const filterValue = field.filterByFieldName
		? getFieldStringValue(formValues[field.filterByFieldName])
		: "";

	if (!filterValue) {
		return field.options;
	}

	return field.options.filter(
		(option) => !option.groupKey || option.groupKey === filterValue,
	);
}

function getSubmitButtonLabel(
	isSubmitting: boolean,
	isEditing: boolean,
	entityLabel: string,
) {
	if (isSubmitting) {
		return isEditing ? "Guardando cambios..." : "Creando registro...";
	}

	return isEditing ? `Guardar ${entityLabel}` : `Crear ${entityLabel}`;
}

export default function CatalogAdminForm(props: Props) {
	const formKey = props.editingId ?? "new";

	return <CatalogAdminFormContent key={formKey} {...props} />;
}

function CatalogAdminFormContent({
	entityLabel,
	entityLabelPlural,
	basePath,
	apiBasePath,
	initialValues,
	fields,
	editingId = null,
	editingTitle = null,
	cancelHref = null,
	showHeader = true,
	editPathPattern,
	createRedirectToEdit = false,
}: Props) {
	const router = useRouter();
	const [formValues, setFormValues] =
		useState<Record<string, FormValue>>(initialValues);
	const [errorMessage, setErrorMessage] = useState("");
	const [successMessage, setSuccessMessage] = useState("");
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [uploadingFieldName, setUploadingFieldName] = useState<string | null>(
		null,
	);
	const [imageStatusMessages, setImageStatusMessages] = useState<
		Record<string, string>
	>({});
	const isEditing = Boolean(editingId);

	function handleTextFieldChange(name: string, value: string) {
		setFormValues((current) => {
			const nextValues = {
				...current,
				[name]: value,
			};

			if (name === "productCategoryId") {
				nextValues.productLineId = "";
				nextValues.productSubcategoryId = "";
				nextValues.parentSubcategoryId = "";
			}

			if (name === "productLineId") {
				nextValues.productSubcategoryId = "";
				nextValues.parentSubcategoryId = "";
			}

			return nextValues;
		});
	}

	function handleCheckboxFieldChange(name: string, checked: boolean) {
		setFormValues((current) => ({
			...current,
			[name]: checked,
		}));
	}

	async function handleImageUpload(fieldName: string, file: File) {
		setErrorMessage("");
		setUploadingFieldName(fieldName);
		setImageStatusMessages((current) => ({
			...current,
			[fieldName]: "Subiendo imagen a Cloudinary...",
		}));

		try {
			const formData = new FormData();
			formData.append("file", file);

			const previousImageUrl = getFieldStringValue(formValues[fieldName]);

			if (previousImageUrl) {
				formData.append("previousImageUrl", previousImageUrl);
			}

			const payload = await requestJson<UploadProfileImageResponse>(
				"/api/admin/catalog/upload-image",
				{
					method: "POST",
					body: formData,
					fallbackMessage: "No se pudo subir la imagen",
				},
			);

			setFormValues((current) => ({
				...current,
				[fieldName]: payload.imageUrl,
			}));
			setImageStatusMessages((current) => ({
				...current,
				[fieldName]: payload.message || "Imagen subida correctamente",
			}));
		} catch (error) {
			const message =
				error instanceof ApiClientError
					? error.message
					: "No se pudo subir la imagen";

			setImageStatusMessages((current) => ({
				...current,
				[fieldName]: message,
			}));
		} finally {
			setUploadingFieldName(null);
		}
	}

	function handleClearImage(fieldName: string) {
		setFormValues((current) => ({
			...current,
			[fieldName]: "",
		}));
		setImageStatusMessages((current) => ({
			...current,
			[fieldName]: "La imagen se quitara cuando guardes el registro.",
		}));
	}

	async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault();
		setErrorMessage("");
		setSuccessMessage("");
		setIsSubmitting(true);

		try {
			const payload = await requestJson<{
				error?: string;
				message?: string;
				id?: string;
			}>(
				isEditing ? `${apiBasePath}/${editingId}` : apiBasePath,
				{
					method: isEditing ? "PATCH" : "POST",
					headers: {
						"content-type": "application/json",
					},
					body: JSON.stringify(formValues),
					fallbackMessage: `No se pudo guardar ${entityLabel}`,
				},
			);

			const nextId =
				typeof payload?.id === "string" && payload.id ? payload.id : editingId;

			setSuccessMessage(
				isEditing
					? `${entityLabel} actualizado correctamente`
					: `${entityLabel} creado correctamente`,
			);

			if (!isEditing) {
				if (createRedirectToEdit && nextId && editPathPattern) {
					router.push(resolveEditPath(editPathPattern, nextId));
				} else {
					router.push(basePath);
				}
			}

			router.refresh();
		} catch (error) {
			const message =
				error instanceof ApiClientError
					? error.message
					: `No se pudo guardar ${entityLabel}`;

			setErrorMessage(message);
		} finally {
			setIsSubmitting(false);
		}
	}

	return (
		<>
			{showHeader ? (
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2 className="text-lg font-semibold text-slate-900">
							{isEditing ? `Editar ${entityLabel}` : `Crear ${entityLabel}`}
						</h2>
						<p className="mt-1 text-sm text-slate-600">
							{isEditing && editingTitle
								? `Editando: ${editingTitle}`
								: `Gestiona ${entityLabelPlural} desde este formulario.`}
						</p>
					</div>

					{cancelHref ? (
						<Link
							href={cancelHref}
							className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
						>
							Cancelar
						</Link>
					) : null}
				</div>
			) : null}

			{errorMessage ? (
				<div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
					{errorMessage}
				</div>
			) : null}

			{successMessage ? (
				<div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
					{successMessage}
				</div>
			) : null}

			<SafeForm
				onSubmit={handleSubmit}
				className={showHeader ? "mt-5 space-y-5" : "space-y-5"}
				disableUntilHydrated={false}
			>
				<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
					{fields.map((field) => {
						const currentValue = formValues[field.name];
						const isFullWidth =
							field.type === "textarea" || field.type === "image";

						return (
							<div
								key={field.name}
								className={isFullWidth ? "md:col-span-2" : ""}
							>
								{field.type === "image" ? (
									<CatalogImageUploadField
										fieldName={field.name}
										label={field.label}
										imageUrl={getFieldStringValue(currentValue) || null}
										isUploading={uploadingFieldName === field.name}
										statusText={imageStatusMessages[field.name] ?? null}
										helpText={field.helpText}
										onFileSelected={(file) =>
											void handleImageUpload(field.name, file)
										}
										onClear={() => handleClearImage(field.name)}
									/>
								) : null}

								{field.type !== "checkbox" && field.type !== "image" ? (
									<label
										htmlFor={field.name}
										className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
									>
										{field.label}
									</label>
								) : null}

								{field.type === "textarea" ? (
									<textarea
										id={field.name}
										aria-label={field.label}
										required={field.required}
										placeholder={field.placeholder}
										value={getFieldStringValue(currentValue)}
										onChange={(event) =>
											handleTextFieldChange(field.name, event.target.value)
										}
										className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
									/>
								) : null}

								{field.type === "text" || field.type === "number" ? (
									<input
										id={field.name}
										aria-label={field.label}
										type={field.type}
										required={field.required}
										placeholder={field.placeholder}
										value={getFieldStringValue(currentValue)}
										onChange={(event) =>
											handleTextFieldChange(field.name, event.target.value)
										}
										step={field.step}
										min={field.min}
										className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
									/>
								) : null}

								{field.type === "select" ? (
									<select
										id={field.name}
										aria-label={field.label}
										required={field.required}
										value={getFieldStringValue(currentValue)}
										onChange={(event) =>
											handleTextFieldChange(field.name, event.target.value)
										}
										className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-slate-400"
									>
										<option value="">Selecciona una opcion</option>
										{getFilteredOptions(field, formValues).map((option) => (
											<option key={option.value} value={option.value}>
												{option.label}
											</option>
										))}
									</select>
								) : null}

								{field.type === "checkbox" ? (
									<label
										htmlFor={field.name}
										className="mt-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-700"
									>
										<input
											id={field.name}
											type="checkbox"
											checked={Boolean(currentValue)}
											onChange={(event) =>
												handleCheckboxFieldChange(
													field.name,
													event.target.checked,
												)
											}
											className="h-4 w-4 rounded border-slate-300 text-slate-900"
										/>
										<span>{field.label}</span>
									</label>
								) : null}

								{field.helpText &&
								field.type !== "checkbox" &&
								field.type !== "image" ? (
									<p className="mt-2 text-xs text-slate-500">
										{field.helpText}
									</p>
								) : null}
							</div>
						);
					})}
				</div>

				<div className="flex flex-wrap gap-3">
					<button
						type="submit"
						disabled={isSubmitting || Boolean(uploadingFieldName)}
						className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
					>
						{getSubmitButtonLabel(isSubmitting, isEditing, entityLabel)}
					</button>

					{cancelHref ? (
						<Link
							href={cancelHref}
							className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
						>
							Volver
						</Link>
					) : null}
				</div>
			</SafeForm>
		</>
	);
}
