const CLOUDINARY_HOST = "res.cloudinary.com";

type FileNameOptions = {
	ensurePdfExtension?: boolean;
};

export function isCloudinaryAssetUrl(value: string | null | undefined) {
	if (!value) {
		return false;
	}

	try {
		const url = new URL(value);
		return url.protocol === "https:" && url.hostname === CLOUDINARY_HOST;
	} catch {
		return false;
	}
}

export function sanitizeDownloadFileName(
	value: string | null | undefined,
	fallback = "documento.pdf",
	options: FileNameOptions = {},
) {
	const source = String(value ?? "").trim() || fallback;
	const normalized = source
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-zA-Z0-9._-]+/g, "-")
		.replace(/-+/g, "-")
		.replace(/^[-.]+|[-.]+$/g, "");

	const safeName = normalized || fallback;

	if (options.ensurePdfExtension && !safeName.toLowerCase().endsWith(".pdf")) {
		return `${safeName}.pdf`;
	}

	return safeName;
}

export function isPdfResourceUrl(
	url: string | null | undefined,
	mimeType?: string | null,
	fileName?: string | null,
) {
	if (mimeType === "application/pdf") {
		return true;
	}

	const candidateName = String(fileName ?? "").toLowerCase();

	if (candidateName.endsWith(".pdf")) {
		return true;
	}

	if (!url) {
		return false;
	}

	try {
		const parsedUrl = new URL(url);
		const decodedPath = decodeURIComponent(parsedUrl.pathname).toLowerCase();

		return decodedPath.endsWith(".pdf") || decodedPath.includes("/raw/upload/");
	} catch {
		return false;
	}
}

export function getCloudinaryAttachmentDownloadUrl(
	value: string,
	fileName?: string | null,
) {
	if (!isCloudinaryAssetUrl(value)) {
		return value;
	}

	const url = new URL(value);
	const parts = url.pathname.split("/").filter(Boolean);
	const uploadIndex = parts.findIndex((part) => part === "upload");

	if (uploadIndex === -1) {
		return value;
	}

	const attachmentName = sanitizeDownloadFileName(fileName, "documento.pdf", {
		ensurePdfExtension: true,
	});
	const attachmentSegment = `fl_attachment:${attachmentName}`;
	const currentTransformIndex = uploadIndex + 1;

	if (parts[currentTransformIndex]?.startsWith("fl_attachment")) {
		parts[currentTransformIndex] = attachmentSegment;
	} else {
		parts.splice(currentTransformIndex, 0, attachmentSegment);
	}

	url.pathname = `/${parts.join("/")}`;

	return url.toString();
}
