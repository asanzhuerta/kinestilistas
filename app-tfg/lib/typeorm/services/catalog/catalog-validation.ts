import type {
	AdminUpsertColorChartBody,
	AdminUpsertColorReferenceBody,
	AdminUpsertProductBody,
	AdminUpsertProductCategoryBody,
	AdminUpsertProductLineBody,
	AdminUpsertProductSubcategoryBody,
	AdminUpsertSupportResourceBody,
} from "@/lib/contracts/product-catalog";
import {
	isValidCloudinaryImageUrl,
	isValidColorChartImageUrl,
	isValidColorReferenceImageUrl,
} from "@/lib/cloudinary";
import { normalizeText } from "@/lib/utils/text";

const UUID_PATTERN =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type NormalizeOptions = {
	required?: boolean;
};

type NormalizeSupportResourceOptions = NormalizeOptions & {
	requireContext?: boolean;
};

export type NormalizedProductCategoryWriteInput = {
	name?: string;
	description?: string | null;
	displayOrder?: number;
};

export type NormalizedProductLineWriteInput = {
	name?: string;
	description?: string | null;
	productCategoryId?: string;
	imageUrl?: string | null;
	displayOrder?: number;
};

export type NormalizedProductSubcategoryWriteInput = {
	name?: string;
	description?: string | null;
	productLineId?: string;
	parentSubcategoryId?: string | null;
	displayOrder?: number;
};

export type NormalizedProductWriteInput = {
	name?: string;
	reference?: string;
	description?: string | null;
	productCategoryId?: string;
	productLineId?: string;
	productSubcategoryId?: string | null;
	imageUrl?: string | null;
	format?: string | null;
	packing?: number | null;
	technicalInfo?: string | null;
	statusId?: number;
	basePrice?: string;
	supplier?: string | null;
};

export type NormalizedSupportResourceWriteInput = {
	title?: string;
	description?: string | null;
	resourceTypeId?: number;
	resourceUrl?: string;
	productId?: string | null;
	productLineId?: string | null;
};

export type NormalizedColorChartWriteInput = {
	name?: string;
	description?: string | null;
	productLineId?: string;
	imageUrl?: string | null;
};

export type NormalizedColorReferenceWriteInput = {
	colorChartId?: string;
	code?: string;
	name?: string;
	description?: string | null;
	imageUrl?: string | null;
	imageUrlThumb?: string | null;
	displayOrder?: number;
};

export class CatalogValidationError extends Error {
	status: number;
	code: string;

	constructor(
		message: string,
		status = 400,
		code = "CATALOG_VALIDATION_ERROR",
	) {
		super(message);
		this.name = "CatalogValidationError";
		this.status = status;
		this.code = code;
	}
}

function normalizeRequiredTextField(
	value: string | null | undefined,
	fieldName: string,
	code: string,
) {
	const normalized = normalizeText(value);

	if (!normalized) {
		throw new CatalogValidationError(
			`${fieldName} es obligatorio`,
			400,
			code,
		);
	}

	return normalized;
}

function normalizeOptionalTextField(value: string | null | undefined) {
	if (value === undefined) {
		return undefined;
	}

	return normalizeText(value) || null;
}

function normalizeOptionalCloudinaryImageField(
	value: string | null | undefined,
	fieldName: string,
	code: string,
	validator: (value: string | null) => boolean = isValidCloudinaryImageUrl,
) {
	const normalized = normalizeOptionalTextField(value);

	if (normalized === undefined || normalized === null) {
		return normalized;
	}

	if (!validator(normalized)) {
		throw new CatalogValidationError(`${fieldName} no es válida`, 400, code);
	}

	return normalized;
}

function normalizeUuidField(
	value: string | null | undefined,
	fieldName: string,
	code: string,
	options: NormalizeOptions = {},
) {
	if (value === undefined) {
		if (options.required) {
			throw new CatalogValidationError(
				`${fieldName} es obligatorio`,
				400,
				code,
			);
		}

		return undefined;
	}

	const normalized = normalizeText(value);

	if (!normalized) {
		if (options.required) {
			throw new CatalogValidationError(
				`${fieldName} es obligatorio`,
				400,
				code,
			);
		}

		throw new CatalogValidationError(`${fieldName} no es válido`, 400, code);
	}

	if (!UUID_PATTERN.test(normalized)) {
		throw new CatalogValidationError(`${fieldName} no es válido`, 400, code);
	}

	return normalized;
}

function normalizeNullableUuidField(
	value: string | null | undefined,
	fieldName: string,
	code: string,
) {
	if (value === undefined) {
		return undefined;
	}

	const normalized = normalizeText(value);

	if (!normalized) {
		return null;
	}

	if (!UUID_PATTERN.test(normalized)) {
		throw new CatalogValidationError(`${fieldName} no es válido`, 400, code);
	}

	return normalized;
}

function normalizeLookupIdField(
	value: number | string | null | undefined,
	fieldName: string,
	code: string,
	options: NormalizeOptions = {},
) {
	if (value === undefined) {
		if (options.required) {
			throw new CatalogValidationError(
				`${fieldName} es obligatorio`,
				400,
				code,
			);
		}

		return undefined;
	}

	if (value === null || String(value).trim() === "") {
		throw new CatalogValidationError(
			`${fieldName} es obligatorio`,
			400,
			code,
		);
	}

	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new CatalogValidationError(`${fieldName} no es válido`, 400, code);
	}

	return parsed;
}

function normalizeNonNegativeIntegerField(
	value: number | string | null | undefined,
	fieldName: string,
	code: string,
) {
	if (value === undefined) {
		return undefined;
	}

	if (value === null || String(value).trim() === "") {
		return 0;
	}

	const parsed = Number(value);

	if (!Number.isInteger(parsed) || parsed < 0) {
		throw new CatalogValidationError(`${fieldName} no es válido`, 400, code);
	}

	return parsed;
}

function normalizeOptionalNonNegativeIntegerField(
	value: number | string | null | undefined,
	fieldName: string,
	code: string,
) {
	if (value === undefined) {
		return undefined;
	}

	const normalizedValue = String(value ?? "").trim();

	if (!normalizedValue) {
		return null;
	}

	const parsed = Number(normalizedValue);

	if (!Number.isInteger(parsed) || parsed < 0) {
		throw new CatalogValidationError(`${fieldName} no es válido`, 400, code);
	}

	return parsed;
}

function normalizePriceField(
	value: number | string | null | undefined,
	fieldName: string,
	code: string,
	options: NormalizeOptions = {},
) {
	if (value === undefined) {
		if (options.required) {
			throw new CatalogValidationError(
				`${fieldName} es obligatorio`,
				400,
				code,
			);
		}

		return undefined;
	}

	if (value === null || String(value).trim() === "") {
		throw new CatalogValidationError(
			`${fieldName} es obligatorio`,
			400,
			code,
		);
	}

	const parsed = Number(value);

	if (!Number.isFinite(parsed) || parsed < 0) {
		throw new CatalogValidationError(`${fieldName} no es válido`, 400, code);
	}

	return parsed.toFixed(2);
}

export function normalizeProductCategoryWriteInput(
	input: AdminUpsertProductCategoryBody,
	options: NormalizeOptions = {},
): NormalizedProductCategoryWriteInput {
	return {
		name:
			input.name !== undefined || options.required
				? normalizeRequiredTextField(
						input.name,
						"El nombre de la categoría",
						"PRODUCT_CATEGORY_NAME_REQUIRED",
				  )
				: undefined,
		description: normalizeOptionalTextField(input.description),
		displayOrder: normalizeNonNegativeIntegerField(
			input.displayOrder,
			"El orden de visualización de la categoría",
			"INVALID_PRODUCT_CATEGORY_DISPLAY_ORDER",
		),
	};
}

export function normalizeProductLineWriteInput(
	input: AdminUpsertProductLineBody,
	options: NormalizeOptions = {},
): NormalizedProductLineWriteInput {
	return {
		name:
			input.name !== undefined || options.required
				? normalizeRequiredTextField(
						input.name,
						"El nombre de la línea comercial",
						"PRODUCT_LINE_NAME_REQUIRED",
				  )
				: undefined,
		description: normalizeOptionalTextField(input.description),
		productCategoryId: normalizeUuidField(
			input.productCategoryId,
			"La categoría de producto",
			"INVALID_PRODUCT_LINE_CATEGORY_ID",
			options,
		),
		imageUrl: normalizeOptionalCloudinaryImageField(
			input.imageUrl,
			"La imagen de la línea comercial",
			"INVALID_PRODUCT_LINE_IMAGE_URL",
		),
		displayOrder: normalizeNonNegativeIntegerField(
			input.displayOrder,
			"El orden de visualización de la línea comercial",
			"INVALID_PRODUCT_LINE_DISPLAY_ORDER",
		),
	};
}

export function normalizeProductSubcategoryWriteInput(
	input: AdminUpsertProductSubcategoryBody,
	options: NormalizeOptions = {},
): NormalizedProductSubcategoryWriteInput {
	return {
		name:
			input.name !== undefined || options.required
				? normalizeRequiredTextField(
						input.name,
						"El nombre de la subcategoría",
						"PRODUCT_SUBCATEGORY_NAME_REQUIRED",
				  )
				: undefined,
		description: normalizeOptionalTextField(input.description),
		productLineId: normalizeUuidField(
			input.productLineId,
			"La línea comercial de la subcategoría",
			"INVALID_PRODUCT_SUBCATEGORY_PRODUCT_LINE_ID",
			options,
		),
		parentSubcategoryId: normalizeNullableUuidField(
			input.parentSubcategoryId,
			"La subcategoría padre",
			"INVALID_PRODUCT_SUBCATEGORY_PARENT_ID",
		),
		displayOrder: normalizeNonNegativeIntegerField(
			input.displayOrder,
			"El orden de visualización de la subcategoría",
			"INVALID_PRODUCT_SUBCATEGORY_DISPLAY_ORDER",
		),
	};
}

export function normalizeProductWriteInput(
	input: AdminUpsertProductBody,
	options: NormalizeOptions = {},
): NormalizedProductWriteInput {
	return {
		name:
			input.name !== undefined || options.required
				? normalizeRequiredTextField(
						input.name,
						"El nombre del producto",
						"PRODUCT_NAME_REQUIRED",
				  )
				: undefined,
		reference:
			input.reference !== undefined || options.required
				? normalizeRequiredTextField(
						input.reference,
						"La referencia del producto",
						"PRODUCT_REFERENCE_REQUIRED",
				  )
				: undefined,
		description: normalizeOptionalTextField(input.description),
		productCategoryId: normalizeUuidField(
			input.productCategoryId,
			"La categoría del producto",
			"INVALID_PRODUCT_CATEGORY_ID",
			options,
		),
		productLineId: normalizeUuidField(
			input.productLineId,
			"La línea comercial del producto",
			"INVALID_PRODUCT_LINE_ID",
			options,
		),
		productSubcategoryId: normalizeNullableUuidField(
			input.productSubcategoryId,
			"La subcategoría del producto",
			"INVALID_PRODUCT_SUBCATEGORY_ID",
		),
		imageUrl: normalizeOptionalCloudinaryImageField(
			input.imageUrl,
			"La imagen del producto",
			"INVALID_PRODUCT_IMAGE_URL",
		),
		format: normalizeOptionalTextField(input.format),
		packing: normalizeOptionalNonNegativeIntegerField(
			input.packing,
			"El packing del producto",
			"INVALID_PRODUCT_PACKING",
		),
		technicalInfo: normalizeOptionalTextField(input.technicalInfo),
		statusId: normalizeLookupIdField(
			input.statusId,
			"El estado del producto",
			"INVALID_PRODUCT_STATUS_ID",
			options,
		),
		basePrice: normalizePriceField(
			input.basePrice,
			"El precio base del producto",
			"INVALID_PRODUCT_BASE_PRICE",
			options,
		),
		supplier: normalizeOptionalTextField(input.supplier),
	};
}

export function normalizeSupportResourceWriteInput(
	input: AdminUpsertSupportResourceBody,
	options: NormalizeSupportResourceOptions = {},
): NormalizedSupportResourceWriteInput {
	const normalized = {
		title:
			input.title !== undefined || options.required
				? normalizeRequiredTextField(
						input.title,
						"El título del recurso",
						"SUPPORT_RESOURCE_TITLE_REQUIRED",
				  )
				: undefined,
		description: normalizeOptionalTextField(input.description),
		resourceTypeId: normalizeLookupIdField(
			input.resourceTypeId,
			"El tipo de recurso",
			"INVALID_SUPPORT_RESOURCE_TYPE_ID",
			options,
		),
		resourceUrl:
			input.resourceUrl !== undefined || options.required
				? normalizeRequiredTextField(
						input.resourceUrl,
						"La ubicación del recurso",
						"SUPPORT_RESOURCE_URL_REQUIRED",
				  )
				: undefined,
		productId: normalizeNullableUuidField(
			input.productId,
			"El producto asociado",
			"INVALID_SUPPORT_RESOURCE_PRODUCT_ID",
		),
		productLineId: normalizeNullableUuidField(
			input.productLineId,
			"La línea comercial asociada",
			"INVALID_SUPPORT_RESOURCE_PRODUCT_LINE_ID",
		),
	};

	if (
		options.requireContext &&
		!normalized.productId &&
		!normalized.productLineId
	) {
		throw new CatalogValidationError(
			"El recurso debe estar asociado a un producto o a una línea comercial",
			400,
			"SUPPORT_RESOURCE_CONTEXT_REQUIRED",
		);
	}

	return normalized;
}

export function normalizeColorChartWriteInput(
	input: AdminUpsertColorChartBody,
	options: NormalizeOptions = {},
): NormalizedColorChartWriteInput {
	return {
		name:
			input.name !== undefined || options.required
				? normalizeRequiredTextField(
						input.name,
						"El nombre de la carta de color",
						"COLOR_CHART_NAME_REQUIRED",
				  )
				: undefined,
		description: normalizeOptionalTextField(input.description),
		productLineId: normalizeUuidField(
			input.productLineId,
			"La línea comercial de la carta de color",
			"INVALID_COLOR_CHART_PRODUCT_LINE_ID",
			options,
		),
		imageUrl: normalizeOptionalCloudinaryImageField(
			input.imageUrl,
			"La imagen de la carta de color",
			"INVALID_COLOR_CHART_IMAGE_URL",
			isValidColorChartImageUrl,
		),
	};
}

export function normalizeColorReferenceWriteInput(
	input: AdminUpsertColorReferenceBody,
	options: NormalizeOptions = {},
): NormalizedColorReferenceWriteInput {
	return {
		colorChartId: normalizeUuidField(
			input.colorChartId,
			"La carta de color",
			"INVALID_COLOR_REFERENCE_CHART_ID",
			options,
		),
		code:
			input.code !== undefined || options.required
				? normalizeRequiredTextField(
						input.code,
						"El código de la referencia de color",
						"COLOR_REFERENCE_CODE_REQUIRED",
				  )
				: undefined,
		name:
			input.name !== undefined || options.required
				? normalizeRequiredTextField(
						input.name,
						"El nombre de la referencia de color",
						"COLOR_REFERENCE_NAME_REQUIRED",
				  )
				: undefined,
		description: normalizeOptionalTextField(input.description),
		imageUrl: normalizeOptionalCloudinaryImageField(
			input.imageUrl,
			"La imagen de la referencia de color",
			"INVALID_COLOR_REFERENCE_IMAGE_URL",
			isValidColorReferenceImageUrl,
		),
		imageUrlThumb: normalizeOptionalCloudinaryImageField(
			input.imageUrlThumb,
			"La miniatura de la referencia de color",
			"INVALID_COLOR_REFERENCE_THUMB_IMAGE_URL",
			isValidColorReferenceImageUrl,
		),
		displayOrder: normalizeNonNegativeIntegerField(
			input.displayOrder,
			"El orden de visualización de la referencia de color",
			"INVALID_COLOR_REFERENCE_DISPLAY_ORDER",
		),
	};
}
