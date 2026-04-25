import type { ClientProfilePayload } from "@/lib/contracts/client-profile";

export type UpdateOwnProfileBody = {
	name?: string;
	email?: string;
	company?: string | null;
	phone?: string | null;
	profile_image_url?: string | null;
	password?: string;
	confirmPassword?: string;
	clientProfile?: ClientProfilePayload | null;
};

export type UpdateAdminUserBody = UpdateOwnProfileBody & {
	roleId?: number;
	statusId?: number;
};

export type UpdateProfileResponse = {
	message: string;
};

export type UploadProfileImageResponse = {
	message: string;
	imageUrl: string;
	publicId: string;
};
