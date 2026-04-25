"use client";

import { useMemo, useRef, useState } from "react";
import SafeForm from "@/app/components/forms/SafeForm";
import ClientProfileFieldsSection from "@/app/components/clients/ClientProfileFieldsSection";
import type { ClientFormDataState } from "@/app/components/clients/client-profile-types";
import ProfileIdentitySection from "@/app/components/users/profile/ProfileIdentitySection";
import ProfileDetailsSection from "@/app/components/users/profile/ProfileDetailsSection";
import ProfilePasswordSection from "@/app/components/users/profile/ProfilePasswordSection";
import ProfileFeedbackMessages from "@/app/components/users/profile/ProfileFeedbackMessages";
import ProfileActionsSection from "@/app/components/users/profile/ProfileActionsSection";
import {
	type FormDataState,
	type UserProfileCardProps,
} from "@/app/components/users/profile/user-profile-card-types";
import {
	buildInitialFormData,
	toDateString,
} from "@/app/components/users/profile/user-profile-card-utils";

export default function UserProfileCard({
	user,
	clientProfile = null,
	mode = "view",
	title,
	subtitle,
	roles = [],
	statuses = [],
	backHref,
	submitLabel,
	submitUrl,
	allowPasswordChange = false,
}: UserProfileCardProps) {
	// ============================================================================
	// MODO ACTIVO Y FLAGS DERIVADOS
	// ============================================================================
	const isViewMode = mode === "view";
	const isSelfEditMode = mode === "edit";
	const isAdminEditMode = mode === "admin-edit";
	const isEditableMode = isSelfEditMode || isAdminEditMode;
	const isClientUser = user.role.code === "client";

	const showPasswordSection =
		isAdminEditMode || (isSelfEditMode && allowPasswordChange);

	// ============================================================================
	// ESTADO LOCAL DE LA TARJETA
	// ============================================================================
	const [isSaving, setIsSaving] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [successMessage, setSuccessMessage] = useState<string | null>(null);
	const [formData, setFormData] = useState<FormDataState>(
		buildInitialFormData(user, clientProfile),
	);
	const [isUploadingImage, setIsUploadingImage] = useState(false);
	const [selectedImageName, setSelectedImageName] = useState<string | null>(
		null,
	);
	const fileInputRef = useRef<HTMLInputElement | null>(null);

	// ============================================================================
	// DATOS DERIVADOS
	// ============================================================================
	const createdAt = toDateString(user.created_at);
	const lastLoginAt = toDateString(user.last_login_at);

	const displayedProfileImage = isEditableMode
		? formData.profile_image_url
		: user.profile_image_url;

	const profileImageStatusText = isUploadingImage
		? selectedImageName
			? `Subiendo... ${selectedImageName}`
			: "Subiendo..."
		: selectedImageName
			? `${selectedImageName} preparado para subir`
			: !formData.profile_image_url
				? "Ningún archivo seleccionado"
				: null;

	// ============================================================================
	// HELPERS DE FORMULARIO
	// ============================================================================
	const handleChange =
		(field: keyof FormDataState) =>
		(
			e: React.ChangeEvent<
				HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
			>,
		) => {
			const value =
				field === "roleId" || field === "statusId"
					? Number(e.target.value)
					: e.target.value;

			setFormData((prev) => ({
				...prev,
				[field]: value,
			}));
		};

	const resetForm = () => {
		setFormData(buildInitialFormData(user, clientProfile));
		setSelectedImageName(null);
		setErrorMessage(null);
		setSuccessMessage(null);

		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const handleProfileImageUpload = async (
		e: React.ChangeEvent<HTMLInputElement>,
	) => {
		const file = e.target.files?.[0];

		if (!file) return;

		try {
			setSelectedImageName(file.name);
			setIsUploadingImage(true);
			setErrorMessage(null);
			setSuccessMessage(null);

			const uploadFormData = new FormData();
			uploadFormData.append("file", file);

			const response = await fetch("/api/profile/upload-image", {
				method: "POST",
				body: uploadFormData,
			});

			const body = await response.json().catch(() => null);

			if (!response.ok) {
				throw new Error(body?.message ?? "No se pudo subir la imagen");
			}

			setFormData((prev) => ({
				...prev,
				profile_image_url: body?.imageUrl ?? "",
			}));

			setSuccessMessage(
				"Imagen subida correctamente. Guarda los cambios para aplicarla al perfil.",
			);
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "No se pudo subir la imagen",
			);
			setSelectedImageName(null);
		} finally {
			setIsUploadingImage(false);

			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		}
	};

	const openFilePicker = () => {
		fileInputRef.current?.click();
	};

	// ============================================================================
	// PAYLOAD SEGÚN MODO
	// ============================================================================
	const requestPayload = useMemo(() => {
		if (isViewMode) {
			return null;
		}

		if (isSelfEditMode) {
			return {
				name: formData.name,
				email: formData.email,
				company: formData.company,
				phone: formData.phone,
				profile_image_url: formData.profile_image_url,
				password: showPasswordSection ? formData.password : "",
				confirmPassword: showPasswordSection ? formData.confirmPassword : "",
				clientProfile: isClientUser
						? {
								name: formData.client_name,
								contact_name: formData.contact_name,
								tax_id: formData.tax_id,
								address: formData.address,
								city: formData.city,
								postal_code: formData.postal_code,
								province: formData.province,
								visit_window_start_time: formData.visit_window_start_time,
								visit_window_end_time: formData.visit_window_end_time,
								notes: formData.notes,
							}
						: null,
			};
		}

		if (isAdminEditMode) {
			return {
				name: formData.name,
				email: formData.email,
				company: formData.company,
				phone: formData.phone,
				profile_image_url: formData.profile_image_url,
				roleId: formData.roleId,
				statusId: formData.statusId,
				password: formData.password,
				confirmPassword: formData.confirmPassword,
				clientProfile: isClientUser
						? {
								name: formData.client_name,
								contact_name: formData.contact_name,
								tax_id: formData.tax_id,
								address: formData.address,
								city: formData.city,
								postal_code: formData.postal_code,
								province: formData.province,
								visit_window_start_time: formData.visit_window_start_time,
								visit_window_end_time: formData.visit_window_end_time,
								notes: formData.notes,
							}
						: null,
			};
		}

		return null;
	}, [
		formData,
		isViewMode,
		isSelfEditMode,
		isAdminEditMode,
		showPasswordSection,
		isClientUser,
	]);

	// ============================================================================
	// ENVÍO DEL FORMULARIO
	// ============================================================================
	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();

		if (!submitUrl || !requestPayload) return;

		try {
			setIsSaving(true);
			setErrorMessage(null);
			setSuccessMessage(null);

			const response = await fetch(submitUrl, {
				method: "PATCH",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestPayload),
			});

			const body = await response.json().catch(() => null);

			if (!response.ok) {
				throw new Error(body?.message ?? "No se pudo guardar");
			}

			setSuccessMessage(body?.message ?? "Cambios guardados correctamente");
			setSelectedImageName(null);

			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}

			setFormData((prev) => ({
				...prev,
				password: "",
				confirmPassword: "",
			}));
		} catch (error) {
			setErrorMessage(
				error instanceof Error ? error.message : "No se pudo guardar",
			);
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="mx-auto mt-6 w-full max-w-4xl">
			{/* ==================================================================== */}
			{/* CABECERA OPCIONAL DE LA TARJETA                                       */}
			{/* ==================================================================== */}
			{title || subtitle ? (
				<div className="mb-4">
					{title ? (
						<h2 className="text-2xl font-semibold text-slate-800">{title}</h2>
					) : null}

					{subtitle ? (
						<p className="mt-1 text-sm text-slate-600">{subtitle}</p>
					) : null}
				</div>
			) : null}

			<SafeForm
				onSubmit={handleSubmit}
				className="rounded-2xl border border-gray-200 bg-white p-6 shadow-md"
			>
				<ProfileIdentitySection
					user={user}
					formData={formData}
					isViewMode={isViewMode}
					isSelfEditMode={isSelfEditMode}
					isAdminEditMode={isAdminEditMode}
					displayedProfileImage={displayedProfileImage}
					profileImageStatusText={profileImageStatusText}
					isUploadingImage={isUploadingImage}
					fileInputRef={fileInputRef}
					onChange={handleChange}
					onFileChange={handleProfileImageUpload}
					onOpenFilePicker={openFilePicker}
				/>

				<ProfileDetailsSection
					formData={formData}
					isEditableMode={isEditableMode}
					isAdminEditMode={isAdminEditMode}
					roles={roles}
					statuses={statuses}
					createdAt={createdAt}
					lastLoginAt={lastLoginAt}
					onChange={handleChange}
					userCompany={user.company}
					userPhone={user.phone}
				/>

				{/* ==================================================================== */}
				{/* BLOQUE DE DATOS DE CLIENTE                                           */}
				{/* ==================================================================== */}
				{isClientUser ? (
					<ClientProfileFieldsSection
						formData={{
							client_name: formData.client_name,
							contact_name: formData.contact_name,
							tax_id: formData.tax_id,
							address: formData.address,
							city: formData.city,
							postal_code: formData.postal_code,
							province: formData.province,
							visit_window_start_time: formData.visit_window_start_time,
							visit_window_end_time: formData.visit_window_end_time,
								notes: formData.notes,
							}}
						onChange={(field: keyof ClientFormDataState) => handleChange(field)}
						isEditable={isEditableMode}
						isAdminEditMode={isAdminEditMode}
					/>
				) : null}

				{showPasswordSection ? (
					<ProfilePasswordSection
						password={formData.password}
						confirmPassword={formData.confirmPassword}
						onPasswordChange={(value) =>
							setFormData((prev) => ({ ...prev, password: value }))
						}
						onConfirmPasswordChange={(value) =>
							setFormData((prev) => ({
								...prev,
								confirmPassword: value,
							}))
						}
					/>
				) : null}

				<ProfileFeedbackMessages
					errorMessage={errorMessage}
					successMessage={successMessage}
				/>

				<ProfileActionsSection
					isViewMode={isViewMode}
					isSelfEditMode={isSelfEditMode}
					isAdminEditMode={isAdminEditMode}
					isSaving={isSaving}
					submitLabel={submitLabel}
					backHref={backHref}
					onReset={resetForm}
				/>
			</SafeForm>
		</div>
	);
}
